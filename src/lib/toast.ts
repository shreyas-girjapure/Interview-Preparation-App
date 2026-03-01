import { toast } from "sonner";

type AppToastAction = {
  label: string;
  onClick: () => void;
};

type AppToastPayload = {
  title: string;
  description: string;
  action?: AppToastAction;
};

export function showAppToast({ title, description, action }: AppToastPayload) {
  toast(title, {
    description,
    action,
  });
}
