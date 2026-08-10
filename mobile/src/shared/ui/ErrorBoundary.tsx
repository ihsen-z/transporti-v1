import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from '@/shared/ui/ErrorScreen';
import { reportError } from '@/core/observability';

// Filet de sécurité racine. React n'offre pas d'équivalent en composant de
// fonction : une classe reste obligatoire pour intercepter les exceptions de
// rendu des enfants.
//
// Sans ce composant, une exception de rendu produit un écran rouge en
// développement et un écran BLANC muet en production, sans aucune porte de
// sortie pour l'utilisateur.
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Remontée à l'observabilité. Sans cela le crash n'existe pour personne :
    // on l'apprendrait par les avis du store.
    reportError(error, { componentStack: info.componentStack ?? '' });
  }

  private handleRetry = (): void => {
    // Re-monte l'arbre enfant. Suffit pour une erreur transitoire (données
    // inattendues, course au montage) ; une erreur déterministe se
    // représentera, ce qui est le comportement honnête.
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return <ErrorScreen error={error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
