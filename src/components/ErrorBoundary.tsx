import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Une erreur inattendue est survenue.";
      let details = "";

      try {
        if (this.state.error?.message.startsWith('{')) {
          const errData = JSON.parse(this.state.error.message);
          if (errData.error?.includes('permission-denied')) {
            errorMessage = "Permissions insuffisantes pour effectuer cette action.";
            details = `Opération: ${errData.operationType} sur ${errData.path}`;
          }
        } else {
          errorMessage = this.state.error?.message || errorMessage;
        }
      } catch (e) {
        // Fallback to default message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full border-red-100 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-700">Oups ! Quelque chose a mal tourné</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">{errorMessage}</p>
              {details && (
                <div className="bg-gray-100 p-3 rounded text-xs font-mono text-left overflow-auto max-h-32">
                  {details}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={this.handleReset} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Recharger la page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
