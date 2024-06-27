import { useState } from "react";
import { runCommand } from "../utils/run-command.js";
import { PreCheckStates } from "../constants.js";
import { isFreePort } from "find-free-ports";

export const usePreCheck = ({db, redis, fe, ss} : {
    db: number,
    redis: number,
    fe: number,
    ss: number
}) => {
    const [daemon, setDaemon] = useState<PreCheckStates>(PreCheckStates.RUNNING);
    const [ports, setPorts] = useState<PreCheckStates>(PreCheckStates.RUNNING);
    const callChecks = async () => {
        // For Docker daemon
        runCommand("docker", ["info"]).promise.then(() => {
            setDaemon(PreCheckStates.SUCCESS);
        }).catch((err) => {
            setDaemon(PreCheckStates.FAILED);
        })
        
        // For ports
        if(isNaN(db) || isNaN(redis) || isNaN(fe) || isNaN(ss)){
            setPorts(PreCheckStates.FAILED);
        } else{
            const db_check = await isFreePort(db);
            const redis_check = await isFreePort(redis);
            const fe_check = await isFreePort(fe);
            const ss_check = await isFreePort(ss);
            if(!db_check || !redis_check || !fe_check || !ss_check){
                setPorts(PreCheckStates.FAILED);
            } else{
                setPorts(PreCheckStates.SUCCESS);
            }
        }
            
    }

    return { daemon, ports, callChecks };
}