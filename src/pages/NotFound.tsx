import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="size-16 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mx-auto mb-4">
          <Wallet className="size-8 text-primary-foreground" />
        </div>
        <h1 className="text-6xl font-black tracking-tight mb-2">404</h1>
        <p className="text-base text-muted-foreground mb-6">Oops! Esta página no existe</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
