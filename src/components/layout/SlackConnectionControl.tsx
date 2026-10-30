import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectSlack,
  fetchSlackStatus,
  getSlackConnectUrl,
  sendSlackTestMessage
} from "../../api/slack";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

export function SlackConnectionControl() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const status = useQuery({
    queryKey: ["slack-status"],
    queryFn: fetchSlackStatus,
    refetchInterval: 30_000,
    retry: false
  });
  const disconnectMutation = useMutation({
    mutationFn: disconnectSlack,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slack-status"] });
      showToast({ tone: "success", title: "Slack disconnected" });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Couldn’t disconnect Slack",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });
  const testMessageMutation = useMutation({
    mutationFn: sendSlackTestMessage,
    onSuccess: () => {
      showToast({ tone: "success", title: "Test message sent to Slack" });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Couldn’t send Slack test message",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  if (status.isPending) {
    return <Button variant="secondary" disabled className="hidden px-3 py-2 md:inline-flex">Checking Slack...</Button>;
  }

  if (status.data?.connected) {
    return (
      <>
        <Button
          variant="secondary"
          className="px-3 py-2"
          onClick={() => testMessageMutation.mutate()}
          disabled={testMessageMutation.isPending}
          title="Send a test message to the connected Slack workspace"
        >
          <span className="hidden sm:inline">
            {testMessageMutation.isPending ? "Sending test..." : "Send test message"}
          </span>
          <span className="sm:hidden">Test Slack</span>
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-2"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          title="Disconnect Slack notifications"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="hidden sm:inline">
            {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Slack"}
          </span>
          <span className="sm:hidden">Slack</span>
        </Button>
      </>
    );
  }

  return (
    <Button
      variant="secondary"
      className="px-3 py-2"
      onClick={() => window.location.assign(getSlackConnectUrl())}
      title={status.isError ? "Retry Slack connection status" : "Connect Slack notifications"}
    >
      <span className="hidden sm:inline">{status.isError ? "Retry Slack" : "Connect Slack"}</span>
      <span className="sm:hidden">Slack</span>
    </Button>
  );
}
