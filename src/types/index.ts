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
    /** 回转角度 */
    currentRotationAngle?: number;
    /** 臂膀俯仰角度 */
    currentArmPitchAngle?: number;
    /** 吊绳长度 */
    currentRopeLength?: number;
    /** 在线状态 */
    onlineStatus: OnlineStatus;
}

export enum OnlineStatus {  
    ONLINE = "online",
    OFFLINE = "offline",
}

export interface CurrentWorkCraneData {
    // 在线状态
    onlineStatus: OnlineStatus;
    // 工作时长
    workTime?: string;
    // 操作人
    workerName?: string;
    // 塔吊ID
    craneId?: string;
    // 吊物高度
    craneLoadHeight?: number;
    // 吊钩高度
    currentRopeLength?: number;
    // 回转角度
    currentRotationAngle?: number;
    // 小车距离
    currentCarDistance?: number;
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
    // 塔吊类型
    craneType?: CraneType;

}