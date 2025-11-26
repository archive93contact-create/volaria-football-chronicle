import Home from './pages/Home';
import Nations from './pages/Nations';
import AddNation from './pages/AddNation';
import NationDetail from './pages/NationDetail';
import ContinentalCompetitions from './pages/ContinentalCompetitions';
import CompetitionDetail from './pages/CompetitionDetail';
import CountryCoefficients from './pages/CountryCoefficients';
import AddLeague from './pages/AddLeague';
import AddClub from './pages/AddClub';
import LeagueDetail from './pages/LeagueDetail';
import ClubDetail from './pages/ClubDetail';
import AddSeason from './pages/AddSeason';
import ContinentalSeasonDetail from './pages/ContinentalSeasonDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Nations": Nations,
    "AddNation": AddNation,
    "NationDetail": NationDetail,
    "ContinentalCompetitions": ContinentalCompetitions,
    "CompetitionDetail": CompetitionDetail,
    "CountryCoefficients": CountryCoefficients,
    "AddLeague": AddLeague,
    "AddClub": AddClub,
    "LeagueDetail": LeagueDetail,
    "ClubDetail": ClubDetail,
    "AddSeason": AddSeason,
    "ContinentalSeasonDetail": ContinentalSeasonDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};