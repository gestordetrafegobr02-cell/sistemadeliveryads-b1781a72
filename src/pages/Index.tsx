import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone, Zap, BarChart3 } from 'lucide-react';
import heroBurger from '@/assets/hero-burger.jpg';

export default function Index() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <nav className="relative z-10 max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="font-display text-3xl text-gradient">MenuDigital</h1>
          <Link to="/auth">
            <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
              Acessar Painel
            </Button>
          </Link>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
          <h2 className="font-display text-5xl md:text-7xl text-foreground mb-6 leading-tight">
            Seu cardápio digital
            <br />
            <span className="text-gradient">pronto em minutos</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Crie o cardápio online da sua hamburgueria, pizzaria ou restaurante. 
            Receba pedidos direto no WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="btn-glow bg-primary text-primary-foreground h-14 px-8 text-lg gap-2">
                Começar Grátis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/shop/demo">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-border hover:bg-secondary">
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="glass-card p-8 text-center group hover:border-primary/40 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:glow-primary transition-all">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-2xl text-foreground mb-3">Mobile First</h3>
            <p className="text-muted-foreground">
              Design otimizado para celular. Seus clientes navegam com facilidade.
            </p>
          </div>

          <div className="glass-card p-8 text-center group hover:border-primary/40 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:glow-primary transition-all">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-2xl text-foreground mb-3">WhatsApp Direto</h3>
            <p className="text-muted-foreground">
              Pedidos chegam formatados no seu WhatsApp. Sem complicação.
            </p>
          </div>

          <div className="glass-card p-8 text-center group hover:border-primary/40 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:glow-primary transition-all">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display text-2xl text-foreground mb-3">Facebook Pixel</h3>
            <p className="text-muted-foreground">
              Integre seu Pixel do Facebook e acompanhe conversões automaticamente.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto glass-card p-12 text-center animate-pulse-glow">
          <h2 className="font-display text-4xl text-foreground mb-4">
            Pronto para digitalizar seu menu?
          </h2>
          <p className="text-muted-foreground mb-8">
            Configure em poucos minutos e comece a receber pedidos hoje mesmo.
          </p>
          <Link to="/auth">
            <Button size="lg" className="btn-glow bg-primary text-primary-foreground h-14 px-10 text-lg">
              Criar Minha Loja
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground text-sm">
          <p>© 2026 MenuDigital. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
