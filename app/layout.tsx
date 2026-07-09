export const metadata = {
  title: "TxGuard — Pre-flight risk checks for AI agents",
  description: "Pay-per-call token, address, approval, and phishing checks over MCP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-monospace, monospace", background: "#0a0f0d", color: "#d7e4dc" }}>
        {children}
      </body>
    </html>
  );
}