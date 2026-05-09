import React from "react";

export default function useRecharts() {
  const [Recharts, setRecharts] = React.useState<any | null>(null);

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
