export function ToolDisabled({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-center">
      <div className="font-serif text-3xl text-foreground">{label || "This tool"} is turned off</div>
      <p className="max-w-sm text-muted-foreground">It’s disabled for this environment. An admin can switch it back on in the feature-flag console.</p>
    </div>
  );
}
