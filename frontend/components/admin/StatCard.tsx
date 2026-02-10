import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'primary' | 'accent' | 'warning' | 'danger' | 'neutral';
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    color = 'primary',
}: StatCardProps) {
    const colorClasses = {
        primary: 'bg-primary-50 text-primary-600',
        accent: 'bg-accent-50 text-accent-600',
        warning: 'bg-orange-50 text-orange-600',
        danger: 'bg-red-50 text-red-600',
        neutral: 'bg-slate-100 text-slate-600',
    };

    const trendColors = {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-slate-500',
    };

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && trendValue && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}>
                        <TrendIcon className="w-4 h-4" />
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
