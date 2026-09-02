import { Component } from 'react';
import { TbAlertTriangle } from 'react-icons/tb';

/**
 * Catches render errors so a single broken panel cannot blank the whole app.
 * Must be a class — React has no hook equivalent for componentDidCatch.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the stack in the console; the UI shows only the message.
    console.error('Unhandled render error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid h-full place-items-center p-8">
        <div className="panel max-w-lg p-6 text-center">
          <TbAlertTriangle className="mx-auto h-7 w-7 text-amber-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-100">Something went wrong</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This page hit an unexpected error and stopped rendering. Your saved waylines are
            unaffected.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded bg-panel-900 p-2 text-left text-[11px] text-slate-500">
            {String(error?.message ?? error)}
          </pre>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload the app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
