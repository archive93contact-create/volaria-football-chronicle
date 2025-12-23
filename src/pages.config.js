import About from './pages/About';
import AddClub from './pages/AddClub';
import AddCompetitionSeason from './pages/AddCompetitionSeason';
import AddDomesticCupSeason from './pages/AddDomesticCupSeason';
import AddLeague from './pages/AddLeague';
import AddLocation from './pages/AddLocation';
import AddNation from './pages/AddNation';
import AddSeason from './pages/AddSeason';
import AllClubs from './pages/AllClubs';
import ClubComparison from './pages/ClubComparison';
import ClubDetail from './pages/ClubDetail';
import ClubStability from './pages/ClubStability';
import Coefficients from './pages/Coefficients';
import CompetitionDetail from './pages/CompetitionDetail';
import CompetitionSeasonDetail from './pages/CompetitionSeasonDetail';
import Contact from './pages/Contact';
import ContinentalCompetitions from './pages/ContinentalCompetitions';
import ContinentalSeasonDetail from './pages/ContinentalSeasonDetail';
import CountryRankings from './pages/CountryRankings';
import DomesticCupDetail from './pages/DomesticCupDetail';
import DomesticCupSeasonDetail from './pages/DomesticCupSeasonDetail';
import DomesticCups from './pages/DomesticCups';
import EditSeason from './pages/EditSeason';
import EditSeasonTable from './pages/EditSeasonTable';
import Home from './pages/Home';
import KitGenerator from './pages/KitGenerator';
import LeagueComparison from './pages/LeagueComparison';
import LeagueDetail from './pages/LeagueDetail';
import LocationDetail from './pages/LocationDetail';
import Locations from './pages/Locations';
import NationClubs from './pages/NationClubs';
import NationDetail from './pages/NationDetail';
import NationGenerator from './pages/NationGenerator';
import Nations from './pages/Nations';
import PlayerDetail from './pages/PlayerDetail';
import RecalculateCoefficients from './pages/RecalculateCoefficients';
import Seasons from './pages/Seasons';
import StabilityManager from './pages/StabilityManager';
import Support from './pages/Support';
import UpdateContinentalStats from './pages/UpdateContinentalStats';
import Players from './pages/Players';
import BulkSquadBuilder from './pages/BulkSquadBuilder';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AddClub": AddClub,
    "AddCompetitionSeason": AddCompetitionSeason,
    "AddDomesticCupSeason": AddDomesticCupSeason,
    "AddLeague": AddLeague,
    "AddLocation": AddLocation,
    "AddNation": AddNation,
    "AddSeason": AddSeason,
    "AllClubs": AllClubs,
    "ClubComparison": ClubComparison,
    "ClubDetail": ClubDetail,
    "ClubStability": ClubStability,
    "Coefficients": Coefficients,
    "CompetitionDetail": CompetitionDetail,
    "CompetitionSeasonDetail": CompetitionSeasonDetail,
    "Contact": Contact,
    "ContinentalCompetitions": ContinentalCompetitions,
    "ContinentalSeasonDetail": ContinentalSeasonDetail,
    "CountryRankings": CountryRankings,
    "DomesticCupDetail": DomesticCupDetail,
    "DomesticCupSeasonDetail": DomesticCupSeasonDetail,
    "DomesticCups": DomesticCups,
    "EditSeason": EditSeason,
    "EditSeasonTable": EditSeasonTable,
    "Home": Home,
    "KitGenerator": KitGenerator,
    "LeagueComparison": LeagueComparison,
    "LeagueDetail": LeagueDetail,
    "LocationDetail": LocationDetail,
    "Locations": Locations,
    "NationClubs": NationClubs,
    "NationDetail": NationDetail,
    "NationGenerator": NationGenerator,
    "Nations": Nations,
    "PlayerDetail": PlayerDetail,
    "RecalculateCoefficients": RecalculateCoefficients,
    "Seasons": Seasons,
    "StabilityManager": StabilityManager,
    "Support": Support,
    "UpdateContinentalStats": UpdateContinentalStats,
    "Players": Players,
    "BulkSquadBuilder": BulkSquadBuilder,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};