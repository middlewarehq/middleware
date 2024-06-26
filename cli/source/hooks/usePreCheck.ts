import { useState } from "react";
import { runCommand } from "../utils/run-command.js";
import { PreCheckStates } from "../constants.js";

export const usePreCheck = () => {
    const [daemon, setDaemon] = useState<PreCheckStates>(PreCheckStates.RUNNING);
    const callChecks = () => {
        runCommand("docker", ["info"]).promise.then(() => {
            setDaemon(PreCheckStates.SUCCESS);
        }).catch((err) => {
            setDaemon(PreCheckStates.FAILED);
        })
    }

    return { daemon, callChecks };
}