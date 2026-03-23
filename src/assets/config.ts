import { CraneType } from "../types";

export const config = {
  pcd_file_name: '1_clean_1',
  craneList: [
    {
      crane_id: '1',
      crane_name: 'TC3',
      crane_type: CraneType.BOOM,
      crane_position: { x: -0.1, y: 0.3, z: -1.4 },
      crane_height: 40,
      crane_radius: 10,
      crane_rope_percent: 0.5,
    },
  ],
};