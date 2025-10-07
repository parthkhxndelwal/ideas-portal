import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as QRCode from "qrcode";
import { readFileSync } from "fs";
import { join } from "path";
import { encrypt } from "./crypto";

export async function generateRegistrationPDF(user: any) {
  // Check if payment is completed before generating QR code
  if (user.paymentStatus !== "completed") {
    throw new Error("Payment not completed. QR code cannot be generated until payment is confirmed.")
  }

  // 1. Read the base PDF from the public folder
  const basePdfPath = join(process.cwd(), "public", "entry-pass.pdf");
  const existingPdfBytes = readFileSync(basePdfPath);

  // 2. Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // 3. Embed font for text overlay
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 4. Get the first page
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // 5. Define text placement coordinates
  const marginLeft = 700;
  const spaceBetween = 47.5;
  const nameY = 1245;
  const rollY = nameY - spaceBetween;
  const courseY = rollY - spaceBetween;
  const yearY = courseY - spaceBetween;
  const textSize = 32;
  const textColor = rgb(32 / 255, 28 / 255, 163 / 255);
  // 6. Add text to the page
  firstPage.drawText(user.name || "", { x: marginLeft, y: nameY, size: textSize, font: helveticaFont, color: textColor });
  firstPage.drawText(user.rollNumber || "", { x: marginLeft, y: rollY, size: textSize, font: helveticaFont, color: textColor });
  firstPage.drawText(user.courseAndSemester || "", { x: marginLeft, y: courseY, size: textSize, font: helveticaFont, color: textColor });
  firstPage.drawText(user.year?.toString() || "", { x: marginLeft, y: yearY, size: textSize, font: helveticaFont, color: textColor });

  // 7. Generate encrypted QR code
  const qrData = `participant_ideas3.0_${user.rollNumber}_${user.transactionId}`;
  const encryptedQrData = await encrypt(qrData);
  const qrCodeDataURL = await QRCode.toDataURL(encryptedQrData, { width: 150 });

  // 8. Embed QR code image
  const qrImage = await pdfDoc.embedPng(qrCodeDataURL);
  const qrWidth = 100 * 2.3;
  const qrHeight = 100 * 2.3;
  const qrY = 1100;  // Adjust to center
  const qrX = 260;
  firstPage.drawImage(qrImage, { x: qrX, y: qrY, width: qrWidth, height: qrHeight });

  // 9. Save PDF and return as Buffer for Node.js environment
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

