import { useLocation, Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">
          A página "{location.pathname}" não existe.
        </p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
