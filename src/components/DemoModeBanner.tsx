import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface DemoModeBannerProps {
  storeName: string;
}

export function DemoModeBanner({ storeName }: DemoModeBannerProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 text-sm">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span className="text-center">
          Você está visualizando a <strong>{storeName}</strong> de demonstração.
        </span>
        <Link 
          to="/"
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap"
        >
          Criar minha loja
        </Link>
      </div>
    </div>
  );
}
