import { useLocation } from 'react-router-dom';

export function PageSkeleton() {
  const location = useLocation();
  const path = location.pathname;

  const renderHeader = () => (
    <div className="px-5 pt-8 pb-4 flex justify-between items-center mb-2">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-24 bg-muted/60 rounded-md animate-pulse" />
      </div>
      <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
    </div>
  );

  if (path === '/' || path === '/dashboard') {
    return (
      <div className="min-h-screen">
        {renderHeader()}
        <div className="px-5 space-y-4">
          <div className="h-32 w-full bg-muted rounded-3xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-3 mt-8">
            <div className="h-6 w-32 bg-muted rounded-md animate-pulse mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="size-12 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded-md animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted/60 rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (path === '/movimientos') {
    return (
      <div className="min-h-screen">
        {renderHeader()}
        <div className="px-5 flex justify-center mb-6">
          <div className="h-10 w-48 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="px-5 space-y-4">
          <div className="flex gap-2 mb-6">
            <div className="h-10 flex-1 bg-muted rounded-xl animate-pulse" />
            <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 w-full bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (path === '/metas') {
    return (
      <div className="min-h-screen">
        {renderHeader()}
        <div className="px-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-28 bg-muted rounded-2xl animate-pulse" />
            <div className="h-28 bg-muted rounded-2xl animate-pulse" />
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="h-32 w-full bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Fallback default skeleton
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="size-16 rounded-[28px] bg-muted flex items-center justify-center animate-pulse mb-4">
        <div className="size-8 rounded-full border-4 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
      </div>
      <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
    </div>
  );
}
