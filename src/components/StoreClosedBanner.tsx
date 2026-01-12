import { Clock, AlertTriangle } from 'lucide-react';

export function StoreClosedBanner() {
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mx-4 mb-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-display text-lg text-destructive">Loja Fechada</h3>
          <p className="text-sm text-muted-foreground">
            No momento não estamos aceitando pedidos. Volte em breve!
          </p>
        </div>
      </div>
    </div>
  );
}
