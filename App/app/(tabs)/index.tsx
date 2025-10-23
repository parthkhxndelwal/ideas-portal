import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { Camera, CameraView } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, Vibration, View, useWindowDimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localStorage } from '../../services/localStorage';
import { BatchEntry, Registration, scannerAPI } from '../../services/scannerAPI';
import { syncService } from '../../services/syncService';
import { decryptVolunteerQRData } from '../../utils/crypto';

interface ScannedData {
  type: string;
  data: string;
  timestamp: number;
  qrType?: "volunteer" | "participant" | "unknown";
  rollNumber?: string | null;
  transactionId?: string | null;
  isValid?: boolean;
  participantDetails?: Registration | null;
  alreadyScannedToday?: boolean;
}

interface Settings {
  vibration: boolean;
  autoOpen: boolean;
  saveHistory: boolean;
  beepOnScan: boolean;
}

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<ScannedData | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [showResultCard, setShowResultCard] = useState(false);
  const [currentScanResult, setCurrentScanResult] = useState<ScannedData | null>(null);
  const [isScanningDisabled, setIsScanningDisabled] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  
  const insets = useSafeAreaInsets();
  
  // Audio players for beep sound
  const beepPlayer = useAudioPlayer(require('../../assets/audio/beep.mp3'));

  // Animation values
  const scanLinePosition = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  const resultCardTranslateY = useSharedValue(300);
  const drawerHeight = useSharedValue(0); // 0 = collapsed, 1 = expanded

  useEffect(() => {
    getCameraPermissions();
    startScanAnimation();
    
    // Mark audio as ready once component mounts
    setIsAudioReady(true);
    
    // Cleanup is automatic with useAudioPlayer
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const playBeep = () => {
    try {
      if (isAudioReady && beepPlayer) {
        beepPlayer.seekTo(0);
        beepPlayer.play();
      }
    } catch {
      console.error('Error playing beep');
    }
  };

  const startScanAnimation = () => {
    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  };

  const animatedScanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(scanLinePosition.value, [0, 1], [0, 250]),
        },
      ],
    };
  });

  const animatedCornerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
      opacity: successScale.value,
    };
  });

  const { height: windowHeight } = useWindowDimensions();

  const animatedResultCardStyle = useAnimatedStyle(() => {
    const expandedHeight = windowHeight * 0.9; // 90% of screen height when expanded
    const collapsedHeight = 300; // Default collapsed height

    const height = interpolate(drawerHeight.value, [0, 1], [collapsedHeight, expandedHeight]);

    return {
      transform: [{ translateY: resultCardTranslateY.value }],
      height: height,
    };
  });

  const showResultCardAnimation = () => {
    console.log('Showing result card animation');
    setShowResultCard(true);
    setIsDrawerExpanded(false);
    resultCardTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  };

  const hideResultCardAnimation = () => {
    resultCardTranslateY.value = withTiming(300, { duration: 300, easing: Easing.in(Easing.ease) });
    setTimeout(() => {
      setShowResultCard(false);
      setCurrentScanResult(null);
      setIsDrawerExpanded(false);
      drawerHeight.value = 0;
    }, 300);
  };

  const toggleDrawerExpansion = () => {
    const newExpanded = !isDrawerExpanded;
    setIsDrawerExpanded(newExpanded);
    drawerHeight.value = withTiming(newExpanded ? 1 : 0, { duration: 300, easing: Easing.out(Easing.ease) });
  };

  const onGestureEvent = (event: any) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) { // Dragging down
      const progress = Math.min(translationY / 200, 1);
      drawerHeight.value = Math.max(0, (isDrawerExpanded ? 1 : 0) - progress);
    } else if (translationY < 0) { // Dragging up
      const progress = Math.min(-translationY / 200, 1);
      drawerHeight.value = Math.min(1, (isDrawerExpanded ? 1 : 0) + progress);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // Determine if we should expand or collapse based on gesture
      const shouldExpand = (translationY < -50 && velocityY < -500) || 
                          (translationY > 50 && velocityY > 500) ? !isDrawerExpanded : 
                          drawerHeight.value > 0.5;
      
      setIsDrawerExpanded(shouldExpand);
      drawerHeight.value = withTiming(shouldExpand ? 1 : 0, { 
        duration: 300, 
        easing: Easing.out(Easing.ease) 
      });
    }
  };

  const checkIfAlreadyScannedToday = async (rollNumber: string): Promise<boolean> => {
    try {
      const pendingScans = await localStorage.getPendingScans();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Check both pending scans and history to cover cases where scans were already synced
      const inPendingScans = pendingScans.some(scan =>
        scan.rollNumber === rollNumber &&
        scan.entryDate === today
      );

      if (inPendingScans) {
        return true;
      }

      // Also check scan history as a backup
      const historyStr = await AsyncStorage.getItem('scanHistory');
      if (historyStr) {
        const history: ScannedData[] = JSON.parse(historyStr);
        const todayStart = new Date(today).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;

        return history.some(scan =>
          scan.rollNumber === rollNumber &&
          scan.qrType === 'participant' &&
          scan.isValid === true &&
          scan.timestamp >= todayStart &&
          scan.timestamp < todayEnd
        );
      }

      return false;
    } catch (error) {
      console.error('Error checking scan history:', error);
      return false;
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // Prevent multiple scans of the same QR code
    if (isScanningDisabled) return;

    // Decrypt and validate the QR data
    const decryptedInfo = decryptVolunteerQRData(data);
    
    // Load settings first
    const settings = await loadSettings();

    // For valid QRs, provide feedback; for unknown, minimal feedback
    if (decryptedInfo.isValid) {
      // Disable scanning temporarily to prevent multiple scans
      setIsScanningDisabled(true);
      
      // Re-enable scanning after 3 seconds
      setTimeout(() => {
        setIsScanningDisabled(false);
      }, 3000);

      // Vibration feedback
      if (settings.vibration) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Fallback to regular vibration
          Vibration.vibrate(100);
        }
      }

      // Beep sound
      if (settings.beepOnScan) {
        playBeep();
      }

      // Success animation
      successScale.value = withSequence(
        withTiming(1.5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      );
    }

    const scannedItem: ScannedData = {
      type,
      data,
      timestamp: Date.now(),
      qrType: decryptedInfo.qrType,
      rollNumber: decryptedInfo.rollNumber,
      transactionId: decryptedInfo.transactionId,
      isValid: decryptedInfo.isValid,
    };

    // Fetch participant details and check scan status for valid participants
    if (decryptedInfo.isValid && decryptedInfo.qrType === 'participant' && decryptedInfo.rollNumber) {
      try {
        const participantDetails = await localStorage.getRegistrationByRollNumber(decryptedInfo.rollNumber);
        const alreadyScannedToday = await checkIfAlreadyScannedToday(decryptedInfo.rollNumber);

        scannedItem.participantDetails = participantDetails;
        scannedItem.alreadyScannedToday = alreadyScannedToday;

        console.log('Participant scan result:', {
          rollNumber: decryptedInfo.rollNumber,
          participantFound: !!participantDetails,
          alreadyScannedToday,
          participantDetails
        });

        // Record entry for participants ONLY if:
        // 1. Not already scanned today
        // 2. Participant details found in local storage
        if (!alreadyScannedToday && participantDetails) {
          await recordParticipantEntry(decryptedInfo);
          console.log('Entry recorded for participant:', decryptedInfo.rollNumber);
        } else if (alreadyScannedToday) {
          console.log('Entry NOT recorded - already scanned today:', decryptedInfo.rollNumber);
        } else if (!participantDetails) {
          console.warn('Entry NOT recorded - participant not found in local registrations:', decryptedInfo.rollNumber);
        }
      } catch (error) {
        console.error('Error fetching participant details:', error);
      }
    } else if (decryptedInfo.isValid && decryptedInfo.qrType === 'volunteer') {
      console.log('Volunteer QR scanned:', {
        qrType: decryptedInfo.qrType,
        rollNumber: decryptedInfo.rollNumber
      });
      // Volunteers are just logged, not recorded as entries
    } else {
      console.log('Invalid or unknown QR scan result:', {
        isValid: decryptedInfo.isValid,
        qrType: decryptedInfo.qrType,
        rollNumber: decryptedInfo.rollNumber,
        data: data.substring(0, 50) + (data.length > 50 ? '...' : '')
      });
    }

    setLastScannedData(scannedItem);
    setCurrentScanResult(scannedItem);

    // Save to history if enabled
    if (settings.saveHistory) {
      await saveToHistory(scannedItem);
    }

    // Show floating result card
    showResultCardAnimation();
  };

  const saveToHistory = async (item: ScannedData) => {
    try {
      const history = await AsyncStorage.getItem('scanHistory');
      const historyArray: ScannedData[] = history ? JSON.parse(history) : [];
      historyArray.unshift(item);
      
      // Keep only last 50 items
      const limitedHistory = historyArray.slice(0, 50);
      await AsyncStorage.setItem('scanHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const loadSettings = async (): Promise<Settings> => {
    try {
      const settingsStr = await AsyncStorage.getItem('settings');
      return settingsStr ? JSON.parse(settingsStr) : {
        vibration: true,
        autoOpen: false,
        saveHistory: true,
        beepOnScan: false,
      };
    } catch {
      return {
        vibration: true,
        autoOpen: false,
        saveHistory: true,
        beepOnScan: false,
      };
    }
  };

  const isUrl = (text: string): boolean => {
    return text.startsWith('http://') || text.startsWith('https://');
  };

  const toggleFlash = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available on this device
    }
    setFlashEnabled(!flashEnabled);
  };

  const handleCopy = async (data: string) => {
    await Clipboard.setStringAsync(data);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    hideResultCardAnimation();
  };

  const handleOpen = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
    hideResultCardAnimation();
  };

  const recordParticipantEntry = async (decryptedInfo: {
    originalData: string;
    rollNumber: string | null;
    transactionId: string | null;
    qrType: "volunteer" | "participant" | "unknown";
    isValid: boolean;
  }) => {
    try {
      if (!decryptedInfo.rollNumber) return;

      // Get participant details from local storage
      const registration = await localStorage.getRegistrationByRollNumber(decryptedInfo.rollNumber);
      if (!registration) {
        console.warn('Participant not found in local registrations:', decryptedInfo.rollNumber);
        return;
      }

      // Create batch entry
      const now = new Date();
      const entry: BatchEntry = {
        _id: `LOCAL_SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rollNumber: decryptedInfo.rollNumber,
        name: registration.name,
        qrType: 'participant',
        transactionId: decryptedInfo.transactionId || undefined,
        entryDate: now.toISOString().split('T')[0], // YYYY-MM-DD
        entryTimestamp: now.toISOString(),
        scannedBy: scannerAPI.getDeviceId() || 'UNKNOWN_DEVICE',
        createdAt: now.toISOString(),
      };

      // Record the scan
      await syncService.recordScan(entry);
      console.log('Recorded participant entry:', entry.rollNumber);
    } catch (error) {
      console.error('Failed to record participant entry:', error);
    }
  };

  const handleDismiss = () => {
    hideResultCardAnimation();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#8E8E93" />
        <Text style={styles.text}>No access to camera</Text>
        <Pressable style={styles.button} onPress={getCameraPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashEnabled}
        onBarcodeScanned={isScanningDisabled ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      />
      <View style={styles.overlay}>
        {/* Top section */}
        <View style={[styles.topSection, { paddingTop: insets.top + 60 }]}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>Position the QR code within the frame</Text>
        </View>

        {/* Scanner frame */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            {/* Corner decorations */}
            <Animated.View style={[styles.corner, styles.cornerTopLeft, animatedCornerStyle, isScanningDisabled && styles.disabledCorner]} />
            <Animated.View style={[styles.corner, styles.cornerTopRight, animatedCornerStyle, isScanningDisabled && styles.disabledCorner]} />
            <Animated.View style={[styles.corner, styles.cornerBottomLeft, animatedCornerStyle, isScanningDisabled && styles.disabledCorner]} />
            <Animated.View style={[styles.corner, styles.cornerBottomRight, animatedCornerStyle, isScanningDisabled && styles.disabledCorner]} />

            {/* Scan line - hide when disabled */}
            {!isScanningDisabled && <Animated.View style={[styles.scanLine, animatedScanLineStyle]} />}

            {/* Success indicator */}
            <Animated.View style={[styles.successIndicator, animatedSuccessStyle]}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            </Animated.View>

            {/* Disabled indicator */}
            {isScanningDisabled && (
              <View style={styles.disabledIndicator}>
                <Ionicons name="pause-circle" size={48} color="#FF9500" />
                <Text style={styles.disabledText}>Scanning Paused</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          <View style={styles.controls}>
            <Pressable
              style={[styles.controlButton, flashEnabled && styles.controlButtonActive]}
              onPress={toggleFlash}
            >
              <Ionicons
                name={flashEnabled ? 'flash' : 'flash-off'}
                size={28}
                color={flashEnabled ? '#007AFF' : '#FFFFFF'}
              />
              <Text style={[styles.controlText, flashEnabled && styles.controlTextActive]}>
                Flash
              </Text>
            </Pressable>
          </View>

          {/* Debug Info */}
          

          {lastScannedData && (
            <View style={styles.lastScanned}>
              <Text style={styles.lastScannedTitle}>Last Scanned:</Text>
              <Text style={styles.lastScannedData} numberOfLines={2}>
                {lastScannedData.participantDetails
                  ? `${lastScannedData.participantDetails.name} (${lastScannedData.rollNumber})`
                  : lastScannedData.qrType === 'volunteer' 
                  ? `Volunteer: ${lastScannedData.rollNumber}`
                  : lastScannedData.qrType === 'participant'
                  ? `Participant: ${lastScannedData.rollNumber}`
                  : lastScannedData.data
                }
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Floating Result Card */}
      {showResultCard && currentScanResult && (
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View style={[styles.resultCard, animatedResultCardStyle]}>
            {/* Drawer Handle */}
            <Pressable onPress={toggleDrawerExpansion} style={styles.drawerHandle}>
              <View style={styles.handleIndicator} />
              <Text style={styles.handleText}>
                {isDrawerExpanded ? 'Tap to collapse' : 'Swipe up or tap to expand'}
              </Text>
            </Pressable>

          <View style={styles.resultCardInnerContent}>
            <View style={styles.resultCardHeader}>
              <View style={styles.resultCardIconContainer}>
                {currentScanResult.isValid ? (
                  currentScanResult.qrType === 'participant' ? (
                    currentScanResult.alreadyScannedToday ? (
                      <Ionicons name="warning" size={32} color="#FF9500" />
                    ) : currentScanResult.participantDetails ? (
                      <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                    ) : (
                      <Ionicons name="alert-circle" size={32} color="#FF9500" />
                    )
                  ) : (
                    <Ionicons name="information-circle" size={32} color="#007AFF" />
                  )
                ) : (
                  <Ionicons name="close-circle" size={32} color="#FF3B30" />
                )}
              </View>
              <View style={styles.resultCardContent}>
                <Text style={styles.resultCardTitle}>
                  {currentScanResult.isValid
                    ? currentScanResult.qrType === 'participant'
                      ? (currentScanResult.alreadyScannedToday 
                          ? 'Already Scanned Today' 
                          : currentScanResult.participantDetails 
                            ? 'Entry Recorded' 
                            : 'Participant Not Found')
                      : currentScanResult.qrType === 'volunteer'
                        ? 'Volunteer QR'
                        : 'Valid QR'
                    : 'Invalid QR Format'
                  }
                </Text>
                <Text style={styles.resultCardType}>
                  Type: {currentScanResult.qrType || currentScanResult.type}
                </Text>
              </View>
              <Pressable onPress={handleDismiss} style={styles.dismissButton}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <View style={styles.resultCardData}>
              {currentScanResult.isValid ? (
                currentScanResult.qrType === 'participant' ? (
                  currentScanResult.participantDetails ? (
                    <View>
                      <Text style={styles.participantName}>
                        {currentScanResult.participantDetails.name}
                      </Text>
                      <Text style={styles.participantDetails}>
                        Roll Number: {currentScanResult.participantDetails.rollNumber}
                      </Text>
                      <Text style={styles.participantDetails}>
                        Course: {currentScanResult.participantDetails.courseAndSemester}
                      </Text>
                      <Text style={styles.participantDetails}>
                        Year: {currentScanResult.participantDetails.year}
                      </Text>
                      <Text style={styles.participantDetails}>
                        Payment Status: {currentScanResult.participantDetails.paymentStatus}
                      </Text>
                      {currentScanResult.alreadyScannedToday && (
                        <Text style={styles.alreadyScannedText}>
                          ⚠️ This participant was already scanned today. Duplicate entry not recorded.
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.warningText}>
                        ⚠️ Participant Not Found
                      </Text>
                      <Text style={styles.participantDetails}>
                        Roll Number: {currentScanResult.rollNumber}
                      </Text>
                      {currentScanResult.transactionId && (
                        <Text style={styles.participantDetails}>
                          Transaction ID: {currentScanResult.transactionId}
                        </Text>
                      )}
                      <Text style={styles.warningSubtext}>
                        This participant is not registered in the local database. Please sync the app or check with the organizers.
                      </Text>
                    </View>
                  )
                ) : currentScanResult.qrType === 'volunteer' ? (
                  <View>
                    <Text style={styles.volunteerText}>
                      ℹ️ Volunteer QR Code
                    </Text>
                    <Text style={styles.participantDetails}>
                      Roll Number: {currentScanResult.rollNumber}
                    </Text>
                    <Text style={styles.infoSubtext}>
                      Volunteer QR codes are for identification only and do not record entry.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.resultCardDataText} numberOfLines={3}>
                    {currentScanResult.data}
                  </Text>
                )
              ) : (
                <View>
                  <Text style={styles.invalidQRText}>
                    ❌ Invalid QR Code Format
                  </Text>
                  <Text style={styles.invalidQRSubtext}>
                    This QR code is not valid for IDEAS 3.0. Please ensure you're scanning the correct event QR code.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.resultCardActions}>
              <Pressable
                style={[styles.actionButton, styles.copyButton]}
                onPress={() => handleCopy(currentScanResult.data)}
              >
                <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Copy</Text>
              </Pressable>

              {isUrl(currentScanResult.data) && (
                <Pressable
                  style={[styles.actionButton, styles.openButton]}
                  onPress={() => handleOpen(currentScanResult.data)}
                >
                  <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Open</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.actionButton, styles.dismissButtonAction]}
                onPress={handleDismiss}
              >
                <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
        </PanGestureHandler>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
  },
  disabledCorner: {
    borderColor: '#FF9500',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  successIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -32,
  },
  disabledIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -32,
    alignItems: 'center',
  },
  disabledText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
  },
  controlButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  controlTextActive: {
    color: '#007AFF',
  },
  rescanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  lastScanned: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
  },
  lastScannedTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  lastScannedData: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  text: {
    fontSize: 18,
    color: '#FFFFFF',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  resultCardInnerContent: {
    paddingHorizontal: 20,
  },
  drawerHandle: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 8,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    marginBottom: 8,
  },
  handleText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCardIconContainer: {
    marginRight: 12,
  },
  resultCardContent: {
    flex: 1,
  },
  resultCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  resultCardType: {
    fontSize: 14,
    color: '#8E8E93',
  },
  dismissButton: {
    padding: 4,
  },
  resultCardData: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultCardDataText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },
  participantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  participantDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  alreadyScannedText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
  },
  invalidQRText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  invalidQRSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 16,
    color: '#FF9500',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  volunteerText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  resultCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#007AFF',
  },
  openButton: {
    backgroundColor: '#34C759',
  },
  dismissButtonAction: {
    backgroundColor: '#F2F2F7',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  debugInfo: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
