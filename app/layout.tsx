export const metadata = {
  title: "TxGuard — Pre-flight risk checks for AI agents",
  description:
    "Verdict, risk score, and reasons for any token, address, approval, or URL. Pay-per-call over MCP. Listed on OKX.AI as ASP #4922.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
