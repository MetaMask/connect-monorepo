import type { ReactNode } from 'react';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

type ConnectionCardProps = {
  title: string;
  subtitle?: string | undefined;
  status: ConnectionStatus;
  instanceId?: string | undefined;
  accounts?: string[] | undefined;
  chainId?: string | undefined;
  error?: string | undefined;
  children?: ReactNode | undefined;
};

const statusColors: Record<ConnectionStatus, string> = {
  disconnected: 'bg-gray-200 text-gray-700',
  connecting: 'bg-yellow-200 text-yellow-800',
  connected: 'bg-green-200 text-green-800',
  error: 'bg-red-200 text-red-800',
};

const statusLabels: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Error',
};

/**
 * A reusable card component that shows the connection state for an SDK client.
 */
export function ConnectionCard({
  title,
  subtitle,
  status,
  instanceId,
  accounts,
  chainId,
  error,
  children,
}: ConnectionCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      {/* Instance ID */}
      {instanceId && (
        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs text-gray-500">Instance ID</p>
          <p className="text-sm font-mono text-blue-600 break-all">
            {instanceId}
          </p>
        </div>
      )}

      {/* Connection Details */}
      {status === 'connected' && (
        <div className="space-y-2 mb-3">
          {chainId && (
            <div>
              <p className="text-xs text-gray-500">Chain ID</p>
              <p className="text-sm font-mono">{chainId}</p>
            </div>
          )}
          {accounts && accounts.length > 0 && (
            <div>
              <p className="text-xs text-gray-500">
                Accounts ({accounts.length})
              </p>
              <div className="space-y-1">
                {accounts.map((account, i) => (
                  <p key={i} className="text-sm font-mono truncate">
                    {account}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      {children && <div className="space-y-2">{children}</div>}
    </div>
  );
}

type ActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
};

const buttonVariants = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

export function ActionButton({
  onClick,
  disabled,
  variant = 'primary',
  children,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]}`}
    >
      {children}
    </button>
  );
}
