export enum CraneType {
    BOOM = "boom", // 动臂式塔吊
    FLOOR = "floor", // 固定式塔吊
}

export interface CraneInfo {
    id: string;
    name: string;
    socketId: string;
    type: CraneType;
    position?: {
        x: number;
        y: number;
        z: number;
    };
    radius: number;
    height: number;
    /** 吊钩高度 */
    currentHookHeight?: number;
    /** 小车距离 对于动臂式塔吊来说，是吊钩到塔身的距离 */
    currentCarDistance?: number;
    currentCarDistanceText?: string;
    /** 回转角度 */
    currentRotationAngle?: number;
    currentRotationAngleText?: string;
    /** 臂膀俯仰角度 */
    currentArmPitchAngle?: number;
    currentArmPitchAngleText?: string;
    /** 吊绳长度 */
    currentRopeLength?: number;
    /** 在线状态 */
    onlineStatus: OnlineStatus;

    // 工作时长
    workTime?: string;
    // 操作人
    workerName?: string;
     // 载矩
    loadMatrix?: number;
    // 重量
    weight?: number;
    // 风速
    windSpeed?: number;
    // 吊钩摆幅
    swingWidth?: number;
    // 大臂倾角
    armInclinationAngle?: number;

    /** 吊钩距离地面的高度 */
    currentHeightDistanceFromGround?: number;
}

export enum OnlineStatus {  
    ONLINE = "online",
    OFFLINE = "offline",
}
