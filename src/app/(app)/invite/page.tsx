import { InviteEmailForm } from "@/components/community/InviteEmailForm";
import { invitationDeliveryMode } from "@/lib/invitations/configuration";
export default function InvitePage() { return <InviteEmailForm delivery={invitationDeliveryMode()}/>; }
