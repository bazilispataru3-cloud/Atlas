/** Re-mounts on every navigation: a short, quiet entrance for each screen (disabled with reduced motion). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
