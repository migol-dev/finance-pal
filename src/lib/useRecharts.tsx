import React from "react";

export default function useRecharts() {
  const [Recharts, setRecharts] = React.useState<typeof import("recharts") | null>(null);

  React.useEffect(() => {
    let mounted = true;
    import("recharts")
      .then((mod) => {
        if (mounted) setRecharts(mod);
      })
      .catch(() => {
        if (mounted) setRecharts(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return Recharts;
}
