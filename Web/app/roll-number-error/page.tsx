import Image from "next/image"

export default function RollNumberErrorPage() {
  return (
    <div className="relative min-h-screen bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-neutral-950/70" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-8">
          <div className="flex items-center justify-center gap-4">
            <Image src="/kr-logo.png" alt="KR" width={56} height={56} className="rounded-full" />
            <Image src="/ideas-white.png" alt="IDEAS" width={160} height={48} className="drop-shadow-2xl" />
          </div>

          <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-8 shadow-2xl">
            <div className="text-center space-y-4">
              <p className="text-amber-300 font-semibold text-lg">
                The roll number entered <strong>doesn&apos;t exist</strong> or has incorrect details.
              </p>

              <p className="text-neutral-300">
                Don&apos;t worry — you can still register by proving that your details are legitimate.
              </p>

              <div className="text-left space-y-2 max-w-2xl mx-auto mt-4">
                <p className="font-medium text-neutral-300">You can:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-neutral-400">
                  <li>
                    Email us at{' '}
                    <a href="mailto:krmuevents@krmangalam.edu.in" className="text-blue-400 hover:underline">
                      krmuevents@krmangalam.edu.in
                    </a>
                  </li>
                  <li>Include your Name, Roll Number, Course, Year and Department/School.</li>
                  <li>Further instructions will be conveyed to you over mail.</li>
                </ul>
              </div>

              <p className="text-sm text-neutral-500 italic">
                <strong>Note</strong> that you can only register if you have a <strong>valid ID card</strong>.
              </p>

              <div className="mt-6 text-center">
                <a
                  href="mailto:krmuevents@krmangalam.edu.in"
                  className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-md shadow"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
