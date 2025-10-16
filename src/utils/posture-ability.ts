
/**
 *  计算姿态能力
 *  计算臂膀俯仰角度 这里模型默认是40度为最长臂膀，向上到-50度最小，范围为-40到40，大约90度，根据socket传入的臂长和目标距离计算出当前模型应该俯仰的角度，去换算
 *  计算水平旋转角度 这里程序默认是0度为起点，但模型默认是90度为起点，0度指向正南，所以应该减去90度 得到当前模型应该旋转的角度
 */

import { OFFSET_ROTATION_ANGLE } from "../constants";

// 计算臂膀俯仰角度
export const calculatePostureAbility = ( boomLength: number, targetDistance: number) => {
    if (targetDistance < 0 || targetDistance > boomLength) {
        throw new Error('目标水平距离必须在0到臂长之间');
    }
    
    const angleInRadians = Math.acos(targetDistance / boomLength);
    
    // 将弧度转换为角度[2,3,7](@ref)
    const angleInDegrees = angleInRadians * (180 / Math.PI);
    
    // 返回结果，并保留两位小数以便阅读
    return Number((90 - angleInDegrees).toFixed(2)) as number;

}

// 计算水平旋转角度
export const calcRotationAngle = (targetRotationAngle: number) => {
   return (targetRotationAngle - OFFSET_ROTATION_ANGLE);
}
