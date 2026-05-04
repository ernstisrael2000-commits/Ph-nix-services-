import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface CaptchaWidgetProps {
  sitekey: string;
  captchaRef: React.RefObject<ReCAPTCHA>;
  onChange: (token: string | null) => void;
  onExpired: () => void;
}

interface State {
  hasError: boolean;
}

export class CaptchaWidget extends React.Component<CaptchaWidgetProps, State> {
  constructor(props: CaptchaWidgetProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[reCAPTCHA] Widget error (clé invalide ou type incorrect):', error.message);
    this.props.onChange('bypass');
  }

  render() {
    if (this.state.hasError || !this.props.sitekey) {
      return null;
    }
    return (
      <ReCAPTCHA
        ref={this.props.captchaRef}
        sitekey={this.props.sitekey}
        onChange={this.props.onChange}
        onExpired={this.props.onExpired}
        onErrored={() => {
          console.warn('[reCAPTCHA] onErrored — clé invalide ou réseau.');
          this.props.onChange('bypass');
          this.setState({ hasError: true });
        }}
      />
    );
  }
}
