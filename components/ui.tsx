import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger'; size?: 'sm' | 'md' }> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const base = "w-full rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const sizeStyles = {
    sm: "py-2 px-3 text-sm",
    md: "py-3 px-4"
  };

  const variants = {
    primary: "bg-brand-green text-white shadow-lg shadow-green-200 hover:bg-green-600",
    secondary: "bg-brand-yellow text-brand-dark shadow-lg shadow-yellow-100 hover:bg-yellow-400",
    outline: "border-2 border-brand-green text-brand-green hover:bg-green-50",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };

  return <button className={`${base} ${sizeStyles[size]} ${variants[variant]} ${className}`} {...props} />;
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={`w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition-all ${className}`}
      {...props}
    />
  </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  let colorClass = 'bg-gray-100 text-gray-800';
  if (status === 'PENDING') colorClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  if (status === 'DIKIRIM') colorClass = 'bg-blue-100 text-blue-800 border border-blue-200';
  if (status === 'SELESAI') colorClass = 'bg-green-100 text-green-800 border border-green-200';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
      {status}
    </span>
  );
};

export const LoadingSpinner = () => (
  <div className="flex justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
  </div>
);
