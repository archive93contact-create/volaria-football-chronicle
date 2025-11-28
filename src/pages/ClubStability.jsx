import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Shield } from 'lucide-react';
import StabilityCalculator from '@/components/clubs/StabilityCalculator';
import AdminOnly from '@/components/common/AdminOnly';

export default function ClubStability() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Club Stability</span>
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Shield className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Club Stability Calculator</h1>
                            <p className="text-slate-300 mt-1">Calculate and update stability points for all clubs</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AdminOnly fallback={
                    <div className="text-center py-12 text-slate-500">
                        Admin access required to use this tool.
                    </div>
                }>
                    <StabilityCalculator />

                    <div className="mt-8 p-6 bg-white rounded-xl shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-4">How Stability Points Work</h3>
                        <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
                            <div>
                                <h4 className="font-medium text-slate-700 mb-2">Base Points by Tier</h4>
                                <ul className="space-y-1">
                                    <li>• Tiers 1-4 (TFA): 20 points</li>
                                    <li>• Tier 5 (National Alliance): 16 points</li>
                                    <li>• Tiers 6-9 (Regional): 14 points</li>
                                    <li>• Tiers 10-11: 12 points</li>
                                    <li>• Tiers 12-14: 10 points</li>
                                    <li>• Tier 15+: 8 points</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-700 mb-2">Season Adjustments</h4>
                                <ul className="space-y-1">
                                    <li className="text-emerald-600">• Champion: +4 to +7 (by tier)</li>
                                    <li className="text-emerald-600">• Promoted: +1 to +5 (by tier)</li>
                                    <li className="text-blue-600">• Mid-table: +1</li>
                                    <li className="text-red-600">• Relegated: -2</li>
                                    <li className="text-red-600">• Bottom: -3 total</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-700 mb-2">Status Thresholds</h4>
                                <ul className="space-y-1">
                                    <li className="text-emerald-600">• Thriving: 25+ points</li>
                                    <li className="text-blue-600">• Stable: 15-24 points</li>
                                    <li className="text-amber-600">• Struggling: 5-14 points</li>
                                    <li className="text-red-600">• At Risk: -4 to 4 points</li>
                                    <li className="text-slate-600">• Folded: -5 or below</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-700 mb-2">What It Affects</h4>
                                <ul className="space-y-1">
                                    <li>• Club strength in AI generation</li>
                                    <li>• Facility levels</li>
                                    <li>• Risk of folding</li>
                                    <li>• Narrative storylines</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </AdminOnly>
            </div>
        </div>
    );
}