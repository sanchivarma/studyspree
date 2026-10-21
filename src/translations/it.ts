import soloScene from "./soloScene/it.json";
import roomControls from "./roomControls/it.json";
import sessionSetup from "./sessionSetup/it.json";
import roadmap from "./roadmap/it.json";
import invitations from "./invitations/it.json";
import contacts from "./contacts/it.json";
import calendar from "./calendar/it.json";
import preferences from "./preferences/it.json";
import room from "./room/it.json";
import search from "./search/it.json";
import feedback from "./feedback/it.json";
import notifications from "./notifications/it.json";
import tasks from "./tasks/it.json";
import plans from "./plans/it.json";
import leaderboards from "./leaderboards/it.json";
import partners from "./partners/it.json";
import schedule from "./schedule/it.json";
import feed from "./feed/it.json";
import messages from "./messages/it.json";
import conversations from "./conversations/it.json";
import buddies from "./buddies/it.json";
import groups from "./groups/it.json";
import spaces from "./spaces/it.json";
import community from "./community/it.json";
import achievements from "./achievements/it.json";
import profile from "./profile/it.json";
import statsRange from "./statsRange/it.json";
import dashboard from "./dashboard/it.json";
import characters from "./characters/it.json";
import onboarding from "./onboarding/it.json";
import ambience from "./ambience/it.json";
import webcam from "./webcam/it.json";
import comeback from "./comeback/it.json";
import common from "./common/it.json";
import login from "./login/it.json";
import register from "./register/it.json";
import recovery from "./recovery/it.json";
import home from "./home/it.json";
import study from "./study/it.json";
import session from "./session/it.json";
import complete from "./complete/it.json";
import stats from "./stats/it.json";
import scene from "./scene/it.json";
import settings from "./settings/it.json";
import dev from "./dev/it.json";
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
