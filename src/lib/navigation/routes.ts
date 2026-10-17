import { Home,BookOpen,CalendarDays,ContactRound,BarChart3,UserRound,Settings,Users,MessageCircle,Search,Bell,ListTodo,Flag,Trophy,Calendar,Wallet,Sliders } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/translations";
export type NavigationItem={id:string;href:string;labelKey:TranslationKey;icon:LucideIcon;capability:'account'|null;primary:boolean};
export const navigationItems:readonly NavigationItem[]=[
 {id:'home',href:'/',labelKey:'common.start',icon:Home,capability:null,primary:true},
 {id:'study',href:'/study',labelKey:'common.study',icon:BookOpen,capability:null,primary:true},
 {id:'calendar',href:'/calendar',labelKey:'calendar.title',icon:CalendarDays,capability:null,primary:true},
 {id:'contacts',href:'/contacts',labelKey:'contacts.title',icon:ContactRound,capability:'account',primary:true},
 {id:'stats',href:'/stats',labelKey:'common.stats',icon:BarChart3,capability:null,primary:true},
 {id:'profile',href:'/profile',labelKey:'profile.title',icon:UserRound,capability:null,primary:true},
 {id:'settings',href:'/settings',labelKey:'common.settings',icon:Settings,capability:null,primary:true},
 ...([['spaces',Users],['partners',Users],['buddies',Users],['conversations',MessageCircle],['groups',Users],['feed',MessageCircle],['schedule',Calendar],['leaderboards',Trophy],['tasks',ListTodo],['notifications',Bell],['search',Search],['feedback',Flag],['plans',Wallet],['preferences',Sliders]]as const).map(([id,icon])=>({id,href:`/${id}`,labelKey:`${id}.title` as TranslationKey,icon,capability:'account' as const,primary:false})),
];
