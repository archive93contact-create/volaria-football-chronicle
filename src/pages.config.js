import Home from './pages/Home';
import Nations from './pages/Nations';
import AddNation from './pages/AddNation';
import NationDetail from './pages/NationDetail';
import ContinentalCompetitions from './pages/ContinentalCompetitions';
import CompetitionDetail from './pages/CompetitionDetail';
import AddLeague from './pages/AddLeague';
import AddClub from './pages/AddClub';
import LeagueDetail from './pages/LeagueDetail';
import ClubDetail from './pages/ClubDetail';
import AddSeason from './pages/AddSeason';
import NationClubs from './pages/NationClubs';
import ContinentalSeasonDetail from './pages/ContinentalSeasonDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Seasons from './pages/Seasons';
import UpdateContinentalStats from './pages/UpdateContinentalStats';
import ClubComparison from './pages/ClubComparison';
import DomesticCups from './pages/DomesticCups';
import DomesticCupDetail from './pages/DomesticCupDetail';
import AddDomesticCupSeason from './pages/AddDomesticCupSeason';
import DomesticCupSeasonDetail from './pages/DomesticCupSeasonDetail';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import LeagueComparison from './pages/LeagueComparison';
import RecalculateCoefficients from './pages/RecalculateCoefficients';
import Coefficients from './pages/Coefficients';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Nations": Nations,
    "AddNation": AddNation,
    "NationDetail": NationDetail,
    "ContinentalCompetitions": ContinentalCompetitions,
    "CompetitionDetail": CompetitionDetail,
    "AddLeague": AddLeague,
    "AddClub": AddClub,
    "LeagueDetail": LeagueDetail,
    "ClubDetail": ClubDetail,
    "AddSeason": AddSeason,
    "NationClubs": NationClubs,
    "ContinentalSeasonDetail": ContinentalSeasonDetail,
    "About": About,
    "Contact": Contact,
    "Seasons": Seasons,
    "UpdateContinentalStats": UpdateContinentalStats,
    "ClubComparison": ClubComparison,
    "DomesticCups": DomesticCups,
    "DomesticCupDetail": DomesticCupDetail,
    "AddDomesticCupSeason": AddDomesticCupSeason,
    "DomesticCupSeasonDetail": DomesticCupSeasonDetail,
    "Locations": Locations,
    "LocationDetail": LocationDetail,
    "LeagueComparison": LeagueComparison,
    "RecalculateCoefficients": RecalculateCoefficients,
    "Coefficients": Coefficients,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};