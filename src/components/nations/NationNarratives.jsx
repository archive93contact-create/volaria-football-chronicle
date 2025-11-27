import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Star, Calendar, Award, Shield, Users, Globe, TrendingUp, Flame } from 'lucide-react';

export default function NationNarratives({ nation, leagues, clubs, seasons, continentalSeasons, domesticCups = [], cupSeasons = [] }) {
    const narratives = [];
    
    if (!nation) return null;

    // Founding narrative
    if (nation.founded_year) {
        const age = new Date().getFullYear() - nation.founded_year;
        if (age >= 100) {
            narratives.push({
                icon: BookOpen,
                color: 'text-amber-700',
                bg: 'bg-amber-50',
                title: 'Century of Football',
                text: `Football was established here in ${nation.founded_year}, over a century of the beautiful game.`
            });
        } else if (age >= 50) {
            narratives.push({
                icon: BookOpen,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Footballing Heritage',
                text: `${age} years of footballing tradition since ${nation.founded_year}.`
            });
        }
    }

    // Large pyramid
    if (leagues.length >= 6) {
        narratives.push({
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            title: 'Deep Football Pyramid',
            text: `A comprehensive league structure with ${leagues.length} divisions.`
        });
    } else if (leagues.length >= 4) {
        narratives.push({
            icon: TrendingUp,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Strong League System',
            text: `${leagues.length} divisions form the national football pyramid.`
        });
    }

    // Large number of clubs
    if (clubs.length >= 100) {
        narratives.push({
            icon: Shield,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Football Nation',
            text: `Home to ${clubs.length} clubs - a true footballing powerhouse.`
        });
    } else if (clubs.length >= 50) {
        narratives.push({
            icon: Shield,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
            title: 'Growing Football Scene',
            text: `${clubs.length} clubs compete across the national pyramid.`
        });
    }

    // Most successful club in nation (total domestic trophies: league + cup)
    if (clubs.length > 0) {
        const clubsWithTrophies = clubs.map(c => ({
            ...c,
            totalDomesticTrophies: (c.league_titles || 0) + (c.domestic_cup_titles || 0)
        })).filter(c => c.totalDomesticTrophies > 0).sort((a, b) => b.totalDomesticTrophies - a.totalDomesticTrophies);
        
        if (clubsWithTrophies.length > 0) {
            const topClub = clubsWithTrophies[0];
            narratives.push({
                icon: Trophy,
                color: 'text-amber-500',
                bg: 'bg-amber-50',
                title: 'Most Decorated Club',
                text: `${topClub.name} leads with ${topClub.totalDomesticTrophies} domestic trophies (${topClub.league_titles || 0} league, ${topClub.domestic_cup_titles || 0} cup).`
            });
        }
    }

    // Domestic cup narratives
    if (domesticCups.length > 0) {
        narratives.push({
            icon: Award,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            title: 'Cup Competition',
            text: domesticCups.length === 1 
                ? `The ${domesticCups[0].name} is the nation's premier knockout competition.`
                : `${domesticCups.length} domestic cup competitions provide knockout football drama.`
        });
    }

    // Most successful cup club
    if (clubs.length > 0) {
        const cupWinners = clubs.filter(c => c.domestic_cup_titles > 0).sort((a, b) => b.domestic_cup_titles - a.domestic_cup_titles);
        if (cupWinners.length > 0 && cupWinners[0].domestic_cup_titles >= 2) {
            const topCupClub = cupWinners[0];
            narratives.push({
                icon: Award,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                title: 'Cup Kings',
                text: `${topCupClub.name} dominates cup football with ${topCupClub.domestic_cup_titles} titles.`
            });
        }
    }

    // Cup competition diversity
    if (cupSeasons.length > 0) {
        const cupWinnerNames = [...new Set(cupSeasons.filter(s => s.champion_name).map(s => s.champion_name))];
        if (cupWinnerNames.length >= 5) {
            narratives.push({
                icon: Flame,
                color: 'text-orange-500',
                bg: 'bg-orange-50',
                title: 'Cup Magic',
                text: `${cupWinnerNames.length} different clubs have lifted the cup - the magic of knockout football.`
            });
        }
    }

    // VCC/CCC continental success
    const vccWinners = clubs.filter(c => c.vcc_titles > 0);
    const cccWinners = clubs.filter(c => c.ccc_titles > 0);
    
    if (vccWinners.length > 0) {
        const totalVcc = vccWinners.reduce((sum, c) => sum + c.vcc_titles, 0);
        narratives.push({
            icon: Star,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            title: 'Continental Glory',
            text: `${vccWinners.length} club${vccWinners.length > 1 ? 's' : ''} have won the VCC, with ${totalVcc} title${totalVcc > 1 ? 's' : ''} total.`
        });
    }

    if (cccWinners.length > 0) {
        const totalCcc = cccWinners.reduce((sum, c) => sum + c.ccc_titles, 0);
        narratives.push({
            icon: Award,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'CCC Success',
            text: `${totalCcc} Continental Cup title${totalCcc > 1 ? 's' : ''} brought home by ${cccWinners.length} club${cccWinners.length > 1 ? 's' : ''}.`
        });
    }

    // Membership status
    if (nation.membership === 'VCC') {
        narratives.push({
            icon: Globe,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            title: 'Full VCC Member',
            text: `As a full member of the Volarian Football Confederation, clubs compete in the VCC.`
        });
    } else if (nation.membership === 'CCC') {
        narratives.push({
            icon: Globe,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50',
            title: 'CCC Associate',
            text: `An associate member with clubs competing in the Continental Challenge Cup.`
        });
    }

    // Oldest club
    const clubsWithFounded = clubs.filter(c => c.founded_year).sort((a, b) => a.founded_year - b.founded_year);
    if (clubsWithFounded.length > 0) {
        const oldest = clubsWithFounded[0];
        const age = new Date().getFullYear() - oldest.founded_year;
        if (age >= 100) {
            narratives.push({
                icon: Calendar,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Historic Roots',
                text: `${oldest.name}, founded in ${oldest.founded_year}, is the oldest club (${age}+ years).`
            });
        }
    }

    // Multiple title-winning clubs
    const titleWinners = clubs.filter(c => c.league_titles > 0).length;
    if (titleWinners >= 10) {
        narratives.push({
            icon: Flame,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            title: 'Competitive Landscape',
            text: `${titleWinners} different clubs have won the top-flight title, showing great competition.`
        });
    }

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    National Football Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                    {narratives.slice(0, 6).map((narrative, idx) => (
                        <div key={idx} className={`flex gap-3 p-3 rounded-lg ${narrative.bg}`}>
                            <narrative.icon className={`w-5 h-5 ${narrative.color} flex-shrink-0 mt-0.5`} />
                            <div>
                                <h4 className="font-semibold text-slate-800 text-sm">{narrative.title}</h4>
                                <p className="text-slate-600 text-sm">{narrative.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}