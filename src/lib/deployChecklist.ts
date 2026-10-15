export type DeployReadiness = {
  connected: boolean;
  bound: boolean;
  initialized: boolean;
  canCreate: boolean;
  nextStep: string;
};

export function getDeployReadiness(connected: boolean, contractAddress: string | null, initialized: boolean): DeployReadiness {
  const bound = !!contractAddress;
  const canCreate = connected && bound && initialized;
  const nextStep = !connected
    ? "Connect 1AM/Lace on preprod."
    : !bound
      ? "Deploy or bind a contract on #/deploy."
      : !initialized
        ? "Initialize treasury on #/deploy (Wave 2: signed tx required)."
        : "Ready — create a vault on #/create.";
  return { connected, bound, initialized, canCreate, nextStep };
}
