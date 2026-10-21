import soloScene from "./soloScene/pl.json";
import roomControls from "./roomControls/pl.json";
import sessionSetup from "./sessionSetup/pl.json";
import roadmap from "./roadmap/pl.json";
import invitations from "./invitations/pl.json";
import contacts from "./contacts/pl.json";
import calendar from "./calendar/pl.json";
import preferences from "./preferences/pl.json";
import room from "./room/pl.json";
import search from "./search/pl.json";
import feedback from "./feedback/pl.json";
import notifications from "./notifications/pl.json";
import tasks from "./tasks/pl.json";
import plans from "./plans/pl.json";
import leaderboards from "./leaderboards/pl.json";
import partners from "./partners/pl.json";
import schedule from "./schedule/pl.json";
import feed from "./feed/pl.json";
import messages from "./messages/pl.json";
import conversations from "./conversations/pl.json";
import buddies from "./buddies/pl.json";
import groups from "./groups/pl.json";
import spaces from "./spaces/pl.json";
import community from "./community/pl.json";
import achievements from "./achievements/pl.json";
import profile from "./profile/pl.json";
import statsRange from "./statsRange/pl.json";
import dashboard from "./dashboard/pl.json";
import characters from "./characters/pl.json";
import onboarding from "./onboarding/pl.json";
import ambience from "./ambience/pl.json";
import webcam from "./webcam/pl.json";
import comeback from "./comeback/pl.json";
import common from "./common/pl.json";
import login from "./login/pl.json";
import register from "./register/pl.json";
import recovery from "./recovery/pl.json";
import home from "./home/pl.json";
import study from "./study/pl.json";
import session from "./session/pl.json";
import complete from "./complete/pl.json";
import stats from "./stats/pl.json";
import scene from "./scene/pl.json";
import settings from "./settings/pl.json";
import dev from "./dev/pl.json";
import type { Dictionary } from "./locale";

const dictionary = {
  ...soloScene,
  ...roomControls,
  ...sessionSetup,
  ...roadmap,
  ...invitations,
  ...contacts,
  ...calendar,
  ...preferences,
  ...room,
  ...search,
  ...feedback,
  ...notifications,
  ...tasks,
  ...plans,
  ...leaderboards,
  ...partners,
  ...schedule,
  ...feed,
  ...messages,
  ...conversations,
  ...buddies,
  ...groups,
  ...spaces,
  ...community,
  ...achievements,
  ...profile,
  ...statsRange,
  ...dashboard,
  ...characters,
  ...onboarding,
  ...ambience,
  ...webcam,
  ...comeback,
  ...common,
  ...login,
  ...register,
  ...recovery,
  ...home,
  ...study,
  ...session,
  ...complete,
  ...stats,
  ...scene,
  ...settings,
  ...dev,
} satisfies Dictionary;
export default dictionary;
