export interface SfxItem {
  id: string;
  name: string;
  shortName: string;
  topicName: string;
  fileName: string;
  relPath: string;
}

export interface SfxTopic {
  id: string;
  name: string;
  items: SfxItem[];
}

export interface SfxGroup {
  id: string;
  name: string;
  icon: string;
  topics: SfxTopic[];
}

export const SFX_CATALOG: SfxGroup[] = [
  {
    "id": "01_Thoi_Tiet_Moi_Truong",
    "name": "Thời tiết & Môi trường",
    "icon": "CloudRain",
    "topics": [
      {
        "id": "Dem_Khuya_De_Keu",
        "name": "Dế kêu đêm khuya",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Dế kêu đêm khuya - Dế kêu đồng quê",
            "shortName": "Dế kêu đồng quê",
            "topicName": "Dế kêu đêm khuya",
            "fileName": "cricket on a summer night ｜ Cricket sound effects ｜ Copyright Free Nature sounds.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Dem_Khuya_De_Keu/cricket on a summer night ｜ Cricket sound effects ｜ Copyright Free Nature sounds.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Dế kêu đêm khuya - Dế kêu đồng quê",
            "shortName": "Dế kêu đồng quê",
            "topicName": "Dế kêu đêm khuya",
            "fileName": "CRICKETS CHIRPING SOUND EFFECT - FREE.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Dem_Khuya_De_Keu/CRICKETS CHIRPING SOUND EFFECT - FREE.mp3"
          }
        ]
      },
      {
        "id": "Gio_Rit_Dem_Khuya",
        "name": "Gió rít đêm khuya",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Gió rít đêm khuya - Gió rít rên rỉ trầm thấp",
            "shortName": "Gió rít rên rỉ trầm thấp",
            "topicName": "Gió rít đêm khuya",
            "fileName": "Low Howling Wind Short Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Gio_Rit_Dem_Khuya/Low Howling Wind Short Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Gió rít đêm khuya - Gió bão dữ dội rùng rợn",
            "shortName": "Gió bão dữ dội rùng rợn",
            "topicName": "Gió rít đêm khuya",
            "fileName": "Strong Horror Wind Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Gio_Rit_Dem_Khuya/Strong Horror Wind Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Gio_Thoi_Qua_Cay",
        "name": "Gió thổi qua rặng cây",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Gió thổi qua rặng cây - Giẫm lá xào xạc",
            "shortName": "Giẫm lá xào xạc",
            "topicName": "Gió thổi qua rặng cây",
            "fileName": "Wind blowing tree leaves, SOUND 4k uhd.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Gio_Thoi_Qua_Cay/Wind blowing tree leaves, SOUND 4k uhd.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Gió thổi qua rặng cây - Gió rít rên rỉ trầm thấp",
            "shortName": "Gió rít rên rỉ trầm thấp",
            "topicName": "Gió thổi qua rặng cây",
            "fileName": "WIND sound effect, breeze through the trees, howling wind, breeze sound effect, .mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Gio_Thoi_Qua_Cay/WIND sound effect, breeze through the trees, howling wind, breeze sound effect, .mp3"
          }
        ]
      },
      {
        "id": "Lua_Chay_Bap_Bung",
        "name": "Lửa cháy bập bùng",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Lửa cháy bập bùng - Lửa reo tí tách",
            "shortName": "Lửa reo tí tách",
            "topicName": "Lửa cháy bập bùng",
            "fileName": "Cozy Campfire： A Short Relaxation Video with Crackling Fire Sound.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Lua_Chay_Bap_Bung/Cozy Campfire： A Short Relaxation Video with Crackling Fire Sound.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Lửa cháy bập bùng - Lửa reo tí tách",
            "shortName": "Lửa reo tí tách",
            "topicName": "Lửa cháy bập bùng",
            "fileName": "🔥1080p - Relaxing Campfire Sound & Crackling Fire Sounds #shorts #short.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Lua_Chay_Bap_Bung/🔥1080p - Relaxing Campfire Sound & Crackling Fire Sounds #shorts #short.mp3"
          }
        ]
      },
      {
        "id": "Mua_Phun_Roi_Nhe",
        "name": "Mưa phùn rơi nhẹ",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Mưa phùn rơi nhẹ - Mưa rơi tí tách êm dịu",
            "shortName": "Mưa rơi tí tách êm dịu",
            "topicName": "Mưa phùn rơi nhẹ",
            "fileName": "light rain sound effect - Short Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Mua_Phun_Roi_Nhe/light rain sound effect - Short Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Mưa phùn rơi nhẹ - Mưa rơi tí tách êm dịu",
            "shortName": "Mưa rơi tí tách êm dịu",
            "topicName": "Mưa phùn rơi nhẹ",
            "fileName": "Rain Sounds   15 seconds soundtrack.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Mua_Phun_Roi_Nhe/Rain Sounds   15 seconds soundtrack.mp3"
          }
        ]
      },
      {
        "id": "Mua_Rao_Nang_Hat",
        "name": "Mưa rào nặng hạt",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Mưa rào nặng hạt",
            "shortName": "Mưa rào ào ạt",
            "topicName": "Mưa rào nặng hạt",
            "fileName": "Heavy rain no copyright sound effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Mua_Rao_Nang_Hat/Heavy rain no copyright sound effect.mp3"
          }
        ]
      },
      {
        "id": "Nuoc_Chay_Suoi",
        "name": "Nước suối chảy róc rách",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Nước suối chảy róc rách - Nước chảy cuồn cuộn",
            "shortName": "Nước chảy cuồn cuộn",
            "topicName": "Nước suối chảy róc rách",
            "fileName": "river sound effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Nuoc_Chay_Suoi/river sound effect.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Nước suối chảy róc rách - Nước chảy cuồn cuộn",
            "shortName": "Nước chảy cuồn cuộn",
            "topicName": "Nước suối chảy róc rách",
            "fileName": "river water sound effect no copyright.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Nuoc_Chay_Suoi/river water sound effect no copyright.mp3"
          }
        ]
      },
      {
        "id": "Sam_Ren_Xa_Xa",
        "name": "Sấm rền xa xa",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Sấm rền xa xa",
            "shortName": "Sấm rền ầm ì từ đằng xa",
            "topicName": "Sấm rền xa xa",
            "fileName": "Distant Thunder Rumble ⧸⧸ Thunder sounds for sleeping ⧸⧸ Thunder SFX.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Sam_Ren_Xa_Xa/Distant Thunder Rumble ⧸⧸ Thunder sounds for sleeping ⧸⧸ Thunder SFX.mp3"
          }
        ]
      },
      {
        "id": "Sam_Set_Danh_ang_ang",
        "name": "Sấm sét đánh đùng đoàng",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Sấm sét đánh đùng đoàng - Sấm sét xé toạc bầu trời",
            "shortName": "Sấm sét xé toạc bầu trời",
            "topicName": "Sấm sét đánh đùng đoàng",
            "fileName": "Thunder   Sound effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Sam_Set_Danh_ang_ang/Thunder   Sound effect.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Sấm sét đánh đùng đoàng - Sấm sét xé toạc bầu trời",
            "shortName": "Sấm sét xé toạc bầu trời",
            "topicName": "Sấm sét đánh đùng đoàng",
            "fileName": "Thunder Clap Loud - Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Sam_Set_Danh_ang_ang/Thunder Clap Loud - Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Song_Bien_Vo_Bo",
        "name": "Sóng biển vỗ bờ",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Sóng biển vỗ bờ",
            "shortName": "Sóng vỗ dập dềnh bờ đá",
            "topicName": "Sóng biển vỗ bờ",
            "fileName": "OCEAN SOUND EFFECT [HD].mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Song_Bien_Vo_Bo/OCEAN SOUND EFFECT [HD].mp3"
          }
        ]
      },
      {
        "id": "Tieng_Cho_Soi_Hu",
        "name": "Tiếng chó sói hú",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Tiếng chó sói hú - Gió rít rên rỉ trầm thấp",
            "shortName": "Gió rít rên rỉ trầm thấp",
            "topicName": "Tiếng chó sói hú",
            "fileName": "Wolf howl sound effect ｜ night wolf sound ｜ no copyright ｜ free.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Tieng_Cho_Soi_Hu/Wolf howl sound effect ｜ night wolf sound ｜ no copyright ｜ free.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Tiếng chó sói hú - Gió rít rên rỉ trầm thấp",
            "shortName": "Gió rít rên rỉ trầm thấp",
            "topicName": "Tiếng chó sói hú",
            "fileName": "Wolf Howling Sound Effects.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Tieng_Cho_Soi_Hu/Wolf Howling Sound Effects.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Cho_Sua_Xa",
        "name": "Tiếng chó sủa xa xăm",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Tiếng chó sủa xa xăm - Chó sủa đằng xa",
            "shortName": "Chó sủa đằng xa",
            "topicName": "Tiếng chó sủa xa xăm",
            "fileName": "Dog Barking In Distance Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Tieng_Cho_Sua_Xa/Dog Barking In Distance Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Tiếng chó sủa xa xăm - Chó sủa đằng xa",
            "shortName": "Chó sủa đằng xa",
            "topicName": "Tiếng chó sủa xa xăm",
            "fileName": "Far Away Dog Barking Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Tieng_Cho_Sua_Xa/Far Away Dog Barking Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Qua_Keu",
        "name": "Tiếng quạ kêu",
        "items": [
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Tiếng quạ kêu - Quạ kêu ai oán từng hồi",
            "shortName": "Quạ kêu ai oán từng hồi",
            "topicName": "Tiếng quạ kêu",
            "fileName": "Crow Sound Effect - HD Quality.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Tieng_Qua_Keu/Crow Sound Effect - HD Quality.mp3"
          },
          {
            "id": "c2Z4LzAxX1Rob2lf",
            "name": "Tiếng quạ kêu - Quạ kêu ai oán từng hồi",
            "shortName": "Quạ kêu ai oán từng hồi",
            "topicName": "Tiếng quạ kêu",
            "fileName": "Crow Sound Effect.mp3",
            "relPath": "/sfx/01_Thoi_Tiet_Moi_Truong/Tieng_Qua_Keu/Crow Sound Effect.mp3"
          }
        ]
      }
    ]
  },
  {
    "id": "02_Con_Nguoi_Cam_Xuc_Hanh_Dong",
    "name": "Con người, Cảm xúc & Hành động",
    "icon": "User",
    "topics": [
      {
        "id": "Buoc_Chan_Chay_Gap",
        "name": "Bước chân chạy gấp gáp",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân chạy gấp gáp",
            "shortName": "Bước chân lộp cộp",
            "topicName": "Bước chân chạy gấp gáp",
            "fileName": "Running footsteps.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Chay_Gap/Running footsteps.mp3"
          }
        ]
      },
      {
        "id": "Buoc_Chan_Giay_Cao_Got",
        "name": "Bước chân giày cao gót",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân giày cao gót - Guốc cao gót gõ cộp cộp",
            "shortName": "Guốc cao gót gõ cộp cộp",
            "topicName": "Bước chân giày cao gót",
            "fileName": "High Heels Sound Effect #backgroundsoundeffects.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Giay_Cao_Got/High Heels Sound Effect #backgroundsoundeffects.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân giày cao gót - Bước chân lộp cộp",
            "shortName": "Bước chân lộp cộp",
            "topicName": "Bước chân giày cao gót",
            "fileName": "sound of woman's footsteps in heels.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Giay_Cao_Got/sound of woman's footsteps in heels.mp3"
          }
        ]
      },
      {
        "id": "Buoc_Chan_San_Go",
        "name": "Bước chân trên sàn gỗ",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân trên sàn gỗ - Bước chân lộp cộp",
            "shortName": "Bước chân lộp cộp",
            "topicName": "Bước chân trên sàn gỗ",
            "fileName": "footsteps on wood #1 floor sound effect (royalty free).mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_San_Go/footsteps on wood #1 floor sound effect (royalty free).mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân trên sàn gỗ - Bước chân lộp cộp",
            "shortName": "Bước chân lộp cộp",
            "topicName": "Bước chân trên sàn gỗ",
            "fileName": "Woman Footsteps Slow on Wooden Floor.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_San_Go/Woman Footsteps Slow on Wooden Floor.mp3"
          }
        ]
      },
      {
        "id": "Buoc_Chan_Tren_La_Kho",
        "name": "Bước chân giẫm lá khô",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân giẫm lá khô - Bước chân lộp cộp",
            "shortName": "Bước chân lộp cộp",
            "topicName": "Bước chân giẫm lá khô",
            "fileName": "Footsteps Walking on Leaves ｜ HQ Sound Effects.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Tren_La_Kho/Footsteps Walking on Leaves ｜ HQ Sound Effects.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân giẫm lá khô - Giẫm lá xào xạc",
            "shortName": "Giẫm lá xào xạc",
            "topicName": "Bước chân giẫm lá khô",
            "fileName": "Walking on Dry Leaves Cutscene sound ｜ Studio Fx.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Tren_La_Kho/Walking on Dry Leaves Cutscene sound ｜ Studio Fx.mp3"
          }
        ]
      },
      {
        "id": "Buoc_Chan_Trong_Mua",
        "name": "Bước chân dẫm nước mưa",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân dẫm nước mưa - Bước chân lộp cộp",
            "shortName": "Bước chân lộp cộp",
            "topicName": "Bước chân dẫm nước mưa",
            "fileName": "Footsteps In A Water Puddle SOUND Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Trong_Mua/Footsteps In A Water Puddle SOUND Effect.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Bước chân dẫm nước mưa - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Bước chân dẫm nước mưa",
            "fileName": "Water walk ｜ sound effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Buoc_Chan_Trong_Mua/Water walk ｜ sound effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Cuoi_Gian_Xao",
        "name": "Tiếng cười gian xảo",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tiếng cười gian xảo - Tiếng cười vang rợn người",
            "shortName": "Tiếng cười vang rợn người",
            "topicName": "Tiếng cười gian xảo",
            "fileName": "Evil Laugh Sound Effect (Your search is over).mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Cuoi_Gian_Xao/Evil Laugh Sound Effect (Your search is over).mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tiếng cười gian xảo - Tiếng cười vang rợn người",
            "shortName": "Tiếng cười vang rợn người",
            "topicName": "Tiếng cười gian xảo",
            "fileName": "Psycho Laugh.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Cuoi_Gian_Xao/Psycho Laugh.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Het_Hoang_So",
        "name": "Tieng Het Hoang So",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Het Hoang So - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tieng Het Hoang So",
            "fileName": "Long Scream- Sound Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Het_Hoang_So/Long Scream- Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Het Hoang So - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tieng Het Hoang So",
            "fileName": "Loud scream sfx (Earrape Warning).mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Het_Hoang_So/Loud scream sfx (Earrape Warning).mp3"
          }
        ]
      },
      {
        "id": "Tieng_Ho_Khan",
        "name": "Tieng Ho Khan",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Ho Khan",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tieng Ho Khan",
            "fileName": "Coughing - SOUND EFFECTS - Husten Cough SOUND.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Ho_Khan/Coughing - SOUND EFFECTS - Husten Cough SOUND.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Khoc_Thut_Thit",
        "name": "Tieng Khoc Thut Thit",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Khoc Thut Thit - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tieng Khoc Thut Thit",
            "fileName": "Crying Woman Manic Sound Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Khoc_Thut_Thit/Crying Woman Manic Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Khoc Thut Thit - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tieng Khoc Thut Thit",
            "fileName": "Woman Crying and Sobbing Sound Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Khoc_Thut_Thit/Woman Crying and Sobbing Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Nga_Xuong_Dat",
        "name": "Tieng Nga Xuong Dat",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Nga Xuong Dat - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tieng Nga Xuong Dat",
            "fileName": "Body dropping sound effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Nga_Xuong_Dat/Body dropping sound effect.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Nga Xuong Dat - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tieng Nga Xuong Dat",
            "fileName": "body fall sounds effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Nga_Xuong_Dat/body fall sounds effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tho_Dai",
        "name": "Tieng Tho Dai",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Tho Dai - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tieng Tho Dai",
            "fileName": "Male Sigh Sound Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Tho_Dai/Male Sigh Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Tho Dai - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tieng Tho Dai",
            "fileName": "Sigh - Sound Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Tho_Dai/Sigh - Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tho_Doc_So_Hai",
        "name": "Tieng Tho Doc So Hai",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Tho Doc So Hai - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tieng Tho Doc So Hai",
            "fileName": "heavy breathing sound effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Tho_Doc_So_Hai/heavy breathing sound effect.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Tho Doc So Hai - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tieng Tho Doc So Hai",
            "fileName": "scared breathing sound effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Tho_Doc_So_Hai/scared breathing sound effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tim_Dap_Manh",
        "name": "Tieng Tim Dap Manh",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Tim Dap Manh",
            "shortName": "Tiếng chạy gấp gáp",
            "topicName": "Tieng Tim Dap Manh",
            "fileName": "Fast Heart Beat - Sound Effect.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Tim_Dap_Manh/Fast Heart Beat - Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Vo_Tay",
        "name": "Tieng Vo Tay",
        "items": [
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Vo Tay - Quạ kêu ai oán từng hồi",
            "shortName": "Quạ kêu ai oán từng hồi",
            "topicName": "Tieng Vo Tay",
            "fileName": "Applause form Small Crowd.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Vo_Tay/Applause form Small Crowd.mp3"
          },
          {
            "id": "c2Z4LzAyX0Nvbl9O",
            "name": "Tieng Vo Tay - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tieng Vo Tay",
            "fileName": "Small Audience Applause.mp3",
            "relPath": "/sfx/02_Con_Nguoi_Cam_Xuc_Hanh_Dong/Tieng_Vo_Tay/Small Audience Applause.mp3"
          }
        ]
      }
    ]
  },
  {
    "id": "03_Do_Vat_Nha_Cua_Doi_Song",
    "name": "Đồ vật, Nhà cửa & Đời sống",
    "icon": "Home",
    "topics": [
      {
        "id": "Bat_Quet_Lua_Zippo",
        "name": "Bat Quet Lua Zippo",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Bat Quet Lua Zippo - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Bat Quet Lua Zippo",
            "fileName": "Lighter Flick Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Bat_Quet_Lua_Zippo/Lighter Flick Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Bat Quet Lua Zippo - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Bat Quet Lua Zippo",
            "fileName": "Zippo Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Bat_Quet_Lua_Zippo/Zippo Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Chen_Dia_Roi_Vo",
        "name": "Chen Dia Roi Vo",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Chen Dia Roi Vo - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Chen Dia Roi Vo",
            "fileName": "Ceramic Plate Drop ⧸ No Break, Dish, Porcelain.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Chen_Dia_Roi_Vo/Ceramic Plate Drop ⧸ No Break, Dish, Porcelain.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Chen Dia Roi Vo - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Chen Dia Roi Vo",
            "fileName": "Plate Breaking Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Chen_Dia_Roi_Vo/Plate Breaking Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Chuong_Cua",
        "name": "Chuong Cua",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Chuong Cua - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Chuong Cua",
            "fileName": "Doorbell (Ding Dong) - Sound Effect for Editing.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Chuong_Cua/Doorbell (Ding Dong) - Sound Effect for Editing.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Chuong Cua - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Chuong Cua",
            "fileName": "Ring Doorbell Sound.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Chuong_Cua/Ring Doorbell Sound.mp3"
          }
        ]
      },
      {
        "id": "Dong_Sam_Cua",
        "name": "Dong Sam Cua",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Dong Sam Cua - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Dong Sam Cua",
            "fileName": "Door Slam - Sound FX.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Dong_Sam_Cua/Door Slam - Sound FX.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Dong Sam Cua - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Dong Sam Cua",
            "fileName": "Door Slam sound effect ｜ SFX.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Dong_Sam_Cua/Door Slam sound effect ｜ SFX.mp3"
          }
        ]
      },
      {
        "id": "Go_Cua_Don_Dap",
        "name": "Gõ cửa dồn dập, gấp gáp",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Gõ cửa dồn dập, gấp gáp - Tiếng đập cửa thình thình",
            "shortName": "Tiếng đập cửa thình thình",
            "topicName": "Gõ cửa dồn dập, gấp gáp",
            "fileName": "Banging a door and knocking sound effect angry banging shaking  sounds.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Go_Cua_Don_Dap/Banging a door and knocking sound effect angry banging shaking  sounds.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Gõ cửa dồn dập, gấp gáp - Tiếng đập cửa thình thình",
            "shortName": "Tiếng đập cửa thình thình",
            "topicName": "Gõ cửa dồn dập, gấp gáp",
            "fileName": "SFX - SOUND EFFECT： KNOCKING ＂VERY AGRESSIVE＂ AT HE DOOR.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Go_Cua_Don_Dap/SFX - SOUND EFFECT： KNOCKING ＂VERY AGRESSIVE＂ AT HE DOOR.mp3"
          }
        ]
      },
      {
        "id": "Go_Cua_Go_Binh_Thuong",
        "name": "Gõ cửa gỗ bình thường",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Gõ cửa gỗ bình thường - Tiếng đập cửa thình thình",
            "shortName": "Tiếng đập cửa thình thình",
            "topicName": "Gõ cửa gỗ bình thường",
            "fileName": "8D KNOCK KNOCK 15 sec for Twitch - binaural knocking.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Go_Cua_Go_Binh_Thuong/8D KNOCK KNOCK 15 sec for Twitch - binaural knocking.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Gõ cửa gỗ bình thường - Tiếng đập cửa thình thình",
            "shortName": "Tiếng đập cửa thình thình",
            "topicName": "Gõ cửa gỗ bình thường",
            "fileName": "Realistic Door Knock (Meme Troll Noise) - Sound Effect for editing.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Go_Cua_Go_Binh_Thuong/Realistic Door Knock (Meme Troll Noise) - Sound Effect for editing.mp3"
          }
        ]
      },
      {
        "id": "Keo_Ghe_Go",
        "name": "Kéo ghế gỗ cọt kẹt",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Kéo ghế gỗ cọt kẹt - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Kéo ghế gỗ cọt kẹt",
            "fileName": "Chair Scraping Floor Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Keo_Ghe_Go/Chair Scraping Floor Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Kéo ghế gỗ cọt kẹt - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Kéo ghế gỗ cọt kẹt",
            "fileName": "Wooden Chair Dragged Across Floor Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Keo_Ghe_Go/Wooden Chair Dragged Across Floor Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Kinh_Vo_Tan_Tanh",
        "name": "Kính vỡ tan tành",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Kính vỡ tan tành",
            "shortName": "Kính rơi vỡ xoảng",
            "topicName": "Kính vỡ tan tành",
            "fileName": "Glass Breaking Sound Effect HD ｜ Glass Shattering Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Kinh_Vo_Tan_Tanh/Glass Breaking Sound Effect HD ｜ Glass Shattering Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Lat_Trang_Giay_Sach",
        "name": "Lật trang giấy / sách",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Lật trang giấy / sách - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Lật trang giấy / sách",
            "fileName": "Page Turn Sound Effect! Flip Sound Effect!.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Lat_Trang_Giay_Sach/Page Turn Sound Effect! Flip Sound Effect!.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Lật trang giấy / sách - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Lật trang giấy / sách",
            "fileName": "Turning Book Pages Sound Effect - Free Download & No Copyright.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Lat_Trang_Giay_Sach/Turning Book Pages Sound Effect - Free Download & No Copyright.mp3"
          }
        ]
      },
      {
        "id": "Mo_Cua_Go_Keo_Ket",
        "name": "Mở cửa gỗ kéo kẹt",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Mở cửa gỗ kéo kẹt - Cửa hé mở kẽo kẹt",
            "shortName": "Cửa hé mở kẽo kẹt",
            "topicName": "Mở cửa gỗ kéo kẹt",
            "fileName": "Old Wooden Doors - Open and Close - with Creaking Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Mo_Cua_Go_Keo_Ket/Old Wooden Doors - Open and Close - with Creaking Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Mở cửa gỗ kéo kẹt - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Mở cửa gỗ kéo kẹt",
            "fileName": "Squeaky Hinge Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Mo_Cua_Go_Keo_Ket/Squeaky Hinge Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Mo_Khoa_Cua",
        "name": "Tra chìa mở khóa cửa",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Tra chìa mở khóa cửa - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tra chìa mở khóa cửa",
            "fileName": "Keys Unlocking Door SOUND Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Mo_Khoa_Cua/Keys Unlocking Door SOUND Effect.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Tra chìa mở khóa cửa - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tra chìa mở khóa cửa",
            "fileName": "Opening Door with Key - Free Sound Effects.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Mo_Khoa_Cua/Opening Door with Key - Free Sound Effects.mp3"
          }
        ]
      },
      {
        "id": "Rot_Nuoc_Rot_Tra",
        "name": "Rót nước / rót trà",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Rót nước / rót trà - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Rót nước / rót trà",
            "fileName": "Pouring The Tea Into The Cup Sound FX ｜ Pouring Sound Effects [ FREE DOWNLOAD ].mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Rot_Nuoc_Rot_Tra/Pouring The Tea Into The Cup Sound FX ｜ Pouring Sound Effects [ FREE DOWNLOAD ].mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Rót nước / rót trà - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Rót nước / rót trà",
            "fileName": "sound of ： Pouring A Hot Tea On A Crystal Cup.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Rot_Nuoc_Rot_Tra/sound of ： Pouring A Hot Tea On A Crystal Cup.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Dong_Ho_Qua_Lac_Diem_Gio",
        "name": "Đồng hồ quả lắc điểm giờ",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Đồng hồ quả lắc điểm giờ - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Đồng hồ quả lắc điểm giờ",
            "fileName": "Grandfather Clock Strike Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Tieng_Dong_Ho_Qua_Lac_Diem_Gio/Grandfather Clock Strike Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Đồng hồ quả lắc điểm giờ - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Đồng hồ quả lắc điểm giờ",
            "fileName": "Westminster Grandfather Clock Chime Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Tieng_Dong_Ho_Qua_Lac_Diem_Gio/Westminster Grandfather Clock Chime Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Dong_Ho_Tich_Tac",
        "name": "Đồng hồ tích tắc",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Đồng hồ tích tắc",
            "shortName": "Bản âm thanh 1",
            "topicName": "Đồng hồ tích tắc",
            "fileName": "Echoing Clock Tick ｜ HQ Sound Effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Tieng_Dong_Ho_Tich_Tac/Echoing Clock Tick ｜ HQ Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Viet_But_Tren_Giay",
        "name": "Viết bút trên giấy",
        "items": [
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Viết bút trên giấy - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Viết bút trên giấy",
            "fileName": "Pen On Paper Signing Sound Effect for Youtubers ｜ Royalty Free ｜ No Copyright.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Viet_But_Tren_Giay/Pen On Paper Signing Sound Effect for Youtubers ｜ Royalty Free ｜ No Copyright.mp3"
          },
          {
            "id": "c2Z4LzAzX0RvX1Zh",
            "name": "Viết bút trên giấy - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Viết bút trên giấy",
            "fileName": "Writing with a Pen - sound effect.mp3",
            "relPath": "/sfx/03_Do_Vat_Nha_Cua_Doi_Song/Viet_But_Tren_Giay/Writing with a Pen - sound effect.mp3"
          }
        ]
      }
    ]
  },
  {
    "id": "04_Hanh_Dong_Vu_Khi_Kiem_Hiep",
    "name": "Kiếm hiệp, Vũ khí & Chiến đấu",
    "icon": "Swords",
    "topics": [
      {
        "id": "Kiem_Chem_Gio_Vut",
        "name": "Kiếm chém gió vút",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Kiếm chém gió vút - Cú đấm trúng đích",
            "shortName": "Cú đấm trúng đích",
            "topicName": "Kiếm chém gió vút",
            "fileName": "Swoosh Sound Effect For Fight Scenes Or Transitions ⧸ Sound Effects, Download.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Kiem_Chem_Gio_Vut/Swoosh Sound Effect For Fight Scenes Or Transitions ⧸ Sound Effects, Download.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Kiếm chém gió vút - Kiếm quang rít gió",
            "shortName": "Kiếm quang rít gió",
            "topicName": "Kiếm chém gió vút",
            "fileName": "SWORD SLASH SOUND EFFECT ｜ NO COPYRIGHT.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Kiem_Chem_Gio_Vut/SWORD SLASH SOUND EFFECT ｜ NO COPYRIGHT.mp3"
          }
        ]
      },
      {
        "id": "Kiem_Chem_Nhau_Leng_Keng",
        "name": "Kiếm va nhau leng keng",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Kiếm va nhau leng keng - Kiếm quang rít gió",
            "shortName": "Kiếm quang rít gió",
            "topicName": "Kiếm va nhau leng keng",
            "fileName": "Sword Clash Fight Sound Effects.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Kiem_Chem_Nhau_Leng_Keng/Sword Clash Fight Sound Effects.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Kiếm va nhau leng keng - Kiếm quang rít gió",
            "shortName": "Kiếm quang rít gió",
            "topicName": "Kiếm va nhau leng keng",
            "fileName": "Sword Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Kiem_Chem_Nhau_Leng_Keng/Sword Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Nap_Dan_Sung",
        "name": "Nạp đạn / lên nòng súng",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Nạp đạn / lên nòng súng - Tiếng chạy gấp gáp",
            "shortName": "Tiếng chạy gấp gáp",
            "topicName": "Nạp đạn / lên nòng súng",
            "fileName": "45mm Gun Cock Fast Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Nap_Dan_Sung/45mm Gun Cock Fast Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Nạp đạn / lên nòng súng - Tiếng đạn nổ giòn giã",
            "shortName": "Tiếng đạn nổ giòn giã",
            "topicName": "Nạp đạn / lên nòng súng",
            "fileName": "The sound of a gun cocking.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Nap_Dan_Sung/The sound of a gun cocking.mp3"
          }
        ]
      },
      {
        "id": "Rut_Kiem_Khoi_Vo",
        "name": "Rút kiếm khỏi vỏ",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Rút kiếm khỏi vỏ - Kiếm quang rít gió",
            "shortName": "Kiếm quang rít gió",
            "topicName": "Rút kiếm khỏi vỏ",
            "fileName": "Sword Being Unsheathed SOUND Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Rut_Kiem_Khoi_Vo/Sword Being Unsheathed SOUND Effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Rút kiếm khỏi vỏ - Kiếm quang rít gió",
            "shortName": "Kiếm quang rít gió",
            "topicName": "Rút kiếm khỏi vỏ",
            "fileName": "Sword Draw ⧸ Sword Sheath ｜ Free Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Rut_Kiem_Khoi_Vo/Sword Draw ⧸ Sword Sheath ｜ Free Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Sung_Ban_Lien_Thanh",
        "name": "Súng bắn liên thanh",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Súng bắn liên thanh - Lửa reo tí tách",
            "shortName": "Lửa reo tí tách",
            "topicName": "Súng bắn liên thanh",
            "fileName": "Heavy Machine Gun Fire Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Sung_Ban_Lien_Thanh/Heavy Machine Gun Fire Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Súng bắn liên thanh - Tiếng đạn nổ giòn giã",
            "shortName": "Tiếng đạn nổ giòn giã",
            "topicName": "Súng bắn liên thanh",
            "fileName": "HK G3 (30 ROUND) FULLY AUTOMATIC MACHINE GUN GUNSHOT SOUND EFFECT.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Sung_Ban_Lien_Thanh/HK G3 (30 ROUND) FULLY AUTOMATIC MACHINE GUN GUNSHOT SOUND EFFECT.mp3"
          }
        ]
      },
      {
        "id": "Sung_Luc_Ban",
        "name": "Súng lục bắn từng phát",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Súng lục bắn từng phát",
            "shortName": "Tiếng đạn nổ giòn giã",
            "topicName": "Súng lục bắn từng phát",
            "fileName": "Realistic Gun Shot.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Sung_Luc_Ban/Realistic Gun Shot.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Chuong_Chua",
        "name": "Tiếng chuông chùa ngân vang",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng chuông chùa ngân vang - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng chuông chùa ngân vang",
            "fileName": "temple bell sound effect ｜ temple bell sound no copyright.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Chuong_Chua/temple bell sound effect ｜ temple bell sound no copyright.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng chuông chùa ngân vang - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tiếng chuông chùa ngân vang",
            "fileName": "Temple,,big bell.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Chuong_Chua/Temple,,big bell.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Cung_Ten_Ban",
        "name": "Bắn cung tên bay vút",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Bắn cung tên bay vút - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Bắn cung tên bay vút",
            "fileName": "Arrow and Bow SOUND EFFECT - Pfeil und Bogen SOUNDS SFX.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Cung_Ten_Ban/Arrow and Bow SOUND EFFECT - Pfeil und Bogen SOUNDS SFX.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Bắn cung tên bay vút - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Bắn cung tên bay vút",
            "fileName": "Sound arrow effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Cung_Ten_Ban/Sound arrow effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Dam_Danh_Nhau",
        "name": "Đấm đá / đánh nhau",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Đấm đá / đánh nhau - Cú đấm trúng đích",
            "shortName": "Cú đấm trúng đích",
            "topicName": "Đấm đá / đánh nhau",
            "fileName": "Punch & Impact Sound Effects.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Dam_Danh_Nhau/Punch & Impact Sound Effects.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Đấm đá / đánh nhau - Cú đấm trúng đích",
            "shortName": "Cú đấm trúng đích",
            "topicName": "Đấm đá / đánh nhau",
            "fileName": "Punch Sound Effect..mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Dam_Danh_Nhau/Punch Sound Effect..mp3"
          }
        ]
      },
      {
        "id": "Tieng_Dam_Dao",
        "name": "Tiếng đâm dao / vũ khí sắc",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng đâm dao / vũ khí sắc - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng đâm dao / vũ khí sắc",
            "fileName": "Knife Stab Sound Effect (Original).mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Dam_Dao/Knife Stab Sound Effect (Original).mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng đâm dao / vũ khí sắc - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tiếng đâm dao / vũ khí sắc",
            "fileName": "Knife Stab-Sound Effect #2.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Dam_Dao/Knife Stab-Sound Effect #2.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Dan_Gam_Tuong",
        "name": "Tiếng đạn găm tường",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng đạn găm tường - Âm bass dội mạnh",
            "shortName": "Âm bass dội mạnh",
            "topicName": "Tiếng đạn găm tường",
            "fileName": "BLACK PS2 Ricochet & Bullet Impact Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Dan_Gam_Tuong/BLACK PS2 Ricochet & Bullet Impact Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng đạn găm tường - Âm bass dội mạnh",
            "shortName": "Âm bass dội mạnh",
            "topicName": "Tiếng đạn găm tường",
            "fileName": "Bullet Ricochet Impacts ｜ Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Dan_Gam_Tuong/Bullet Ricochet Impacts ｜ Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Ngua_Hi",
        "name": "Tiếng ngựa hí",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng ngựa hí - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng ngựa hí",
            "fileName": "HORSE - Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Ngua_Hi/HORSE - Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng ngựa hí - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tiếng ngựa hí",
            "fileName": "Horse Neigh Sound Effects ｜ Horse Sound HQ.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Ngua_Hi/Horse Neigh Sound Effects ｜ Horse Sound HQ.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Ngua_Phi",
        "name": "Tiếng ngựa phi nước đại",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng ngựa phi nước đại - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng ngựa phi nước đại",
            "fileName": "Horse Gallop On Gravel - Sound Effect HD.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Ngua_Phi/Horse Gallop On Gravel - Sound Effect HD.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng ngựa phi nước đại - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tiếng ngựa phi nước đại",
            "fileName": "Horse Gallop Sound Effect   YouTube.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Ngua_Phi/Horse Gallop Sound Effect   YouTube.mp3"
          }
        ]
      },
      {
        "id": "Tieng_No_Bom_Lon",
        "name": "Tiếng nổ bom lớn chấn động",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng nổ bom lớn chấn động - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng nổ bom lớn chấn động",
            "fileName": "Big Explosion Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_No_Bom_Lon/Big Explosion Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng nổ bom lớn chấn động - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tiếng nổ bom lớn chấn động",
            "fileName": "Missile And Explosion Green Screen And Chroma Key, With Sound Effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_No_Bom_Lon/Missile And Explosion Green Screen And Chroma Key, With Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tat_Tai",
        "name": "Tiếng tát tai giáng xuống",
        "items": [
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng tát tai giáng xuống - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng tát tai giáng xuống",
            "fileName": "Slap sound effect.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Tat_Tai/Slap sound effect.mp3"
          },
          {
            "id": "c2Z4LzA0X0hhbmhf",
            "name": "Tiếng tát tai giáng xuống - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Tiếng tát tai giáng xuống",
            "fileName": "Slapping Bare Skin - Free Sound Effects.mp3",
            "relPath": "/sfx/04_Hanh_Dong_Vu_Khi_Kiem_Hiep/Tieng_Tat_Tai/Slapping Bare Skin - Free Sound Effects.mp3"
          }
        ]
      }
    ]
  },
  {
    "id": "05_Phuong_Tien_Dien_Thoai",
    "name": "Phương tiện & Điện thoại",
    "icon": "Car",
    "topics": [
      {
        "id": "Coi_Xe_Canh_Sat_Cap_Cuu",
        "name": "Còi xe cảnh sát / cấp cứu",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Còi xe cảnh sát / cấp cứu - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Còi xe cảnh sát / cấp cứu",
            "fileName": "Ambulance siren passing by [Sound Effects].mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Coi_Xe_Canh_Sat_Cap_Cuu/Ambulance siren passing by [Sound Effects].mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Còi xe cảnh sát / cấp cứu - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Còi xe cảnh sát / cấp cứu",
            "fileName": "Police Siren (Distant) - Sound Effect ｜ ProSounds.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Coi_Xe_Canh_Sat_Cap_Cuu/Police Siren (Distant) - Sound Effect ｜ ProSounds.mp3"
          }
        ]
      },
      {
        "id": "Dien_Thoai_Ban_Reo_Co",
        "name": "Điện thoại bàn reo chuông cổ",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Điện thoại bàn reo chuông cổ - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Điện thoại bàn reo chuông cổ",
            "fileName": "Old Telephone Ringing Sound Effect [HD] ｜ Old Telephone Ringtone.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Dien_Thoai_Ban_Reo_Co/Old Telephone Ringing Sound Effect [HD] ｜ Old Telephone Ringtone.mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Điện thoại bàn reo chuông cổ - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Điện thoại bàn reo chuông cổ",
            "fileName": "Plate Dial Old Telephone Ringing Sound.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Dien_Thoai_Ban_Reo_Co/Plate Dial Old Telephone Ringing Sound.mp3"
          }
        ]
      },
      {
        "id": "Dien_Thoai_Rung_Tren_Ban",
        "name": "Điện thoại rung bần bật",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Điện thoại rung bần bật - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Điện thoại rung bần bật",
            "fileName": "Mobile Phone Vibration Sound Effect ｜ Phone Ringing Vibrating Sound Effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Dien_Thoai_Rung_Tren_Ban/Mobile Phone Vibration Sound Effect ｜ Phone Ringing Vibrating Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Điện thoại rung bần bật - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Điện thoại rung bần bật",
            "fileName": "sound of phone vibrating on a table.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Dien_Thoai_Rung_Tren_Ban/sound of phone vibrating on a table.mp3"
          }
        ]
      },
      {
        "id": "O_To_Khoi_Dong_Chay",
        "name": "Ô tô khởi động nổ máy chạy",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Ô tô khởi động nổ máy chạy - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Ô tô khởi động nổ máy chạy",
            "fileName": "Car start & drive away sound effect ｜ sfx ⧸bgm ｜ for videos⧸films #copyrightfree.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/O_To_Khoi_Dong_Chay/Car start & drive away sound effect ｜ sfx ⧸bgm ｜ for videos⧸films #copyrightfree.mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Ô tô khởi động nổ máy chạy - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Ô tô khởi động nổ máy chạy",
            "fileName": "Starting Up Car Engine & Driving Away Sound Effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/O_To_Khoi_Dong_Chay/Starting Up Car Engine & Driving Away Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "O_To_Phanh_Gap",
        "name": "Ô tô phanh rít gấp",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Ô tô phanh rít gấp - Va chạm tông xe mạnh",
            "shortName": "Va chạm tông xe mạnh",
            "topicName": "Ô tô phanh rít gấp",
            "fileName": "Car brake and crash Sound Effect - Audio Vampire.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/O_To_Phanh_Gap/Car brake and crash Sound Effect - Audio Vampire.mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Ô tô phanh rít gấp - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Ô tô phanh rít gấp",
            "fileName": "car screech sound effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/O_To_Phanh_Gap/car screech sound effect.mp3"
          }
        ]
      },
      {
        "id": "Tai_Nan_Tong_Xe",
        "name": "Tai nạn tông xe đâm sầm",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Tai nạn tông xe đâm sầm - Va chạm tông xe mạnh",
            "shortName": "Va chạm tông xe mạnh",
            "topicName": "Tai nạn tông xe đâm sầm",
            "fileName": "Car brake and crash Sound Effect - Audio Vampire.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Tai_Nan_Tong_Xe/Car brake and crash Sound Effect - Audio Vampire.mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Tai nạn tông xe đâm sầm - Va chạm tông xe mạnh",
            "shortName": "Va chạm tông xe mạnh",
            "topicName": "Tai nạn tông xe đâm sầm",
            "fileName": "Car Crash - Sound Effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Tai_Nan_Tong_Xe/Car Crash - Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tau_Hoa_Chay",
        "name": "Tiếng tàu hỏa chạy & còi tàu",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Tiếng tàu hỏa chạy & còi tàu - Còi tàu hỏa hú dài",
            "shortName": "Còi tàu hỏa hú dài",
            "topicName": "Tiếng tàu hỏa chạy & còi tàu",
            "fileName": "Train Horn - Sound Effect (HD).mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Tieng_Tau_Hoa_Chay/Train Horn - Sound Effect (HD).mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Tiếng tàu hỏa chạy & còi tàu - Còi tàu hỏa hú dài",
            "shortName": "Còi tàu hỏa hú dài",
            "topicName": "Tiếng tàu hỏa chạy & còi tàu",
            "fileName": "Train Horn Doppler Effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Tieng_Tau_Hoa_Chay/Train Horn Doppler Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tut_Tut_Cup_May",
        "name": "Tiếng tút tút bận / cúp máy",
        "items": [
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Tiếng tút tút bận / cúp máy - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Tiếng tút tút bận / cúp máy",
            "fileName": "Telephone Busy Signal Sound Effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Tieng_Tut_Tut_Cup_May/Telephone Busy Signal Sound Effect.mp3"
          },
          {
            "id": "c2Z4LzA1X1BodW9u",
            "name": "Tiếng tút tút bận / cúp máy - Tiếng chạy gấp gáp",
            "shortName": "Tiếng chạy gấp gáp",
            "topicName": "Tiếng tút tút bận / cúp máy",
            "fileName": "Telephone Fast Busy Signal⧸Hang Up Sound Effect.mp3",
            "relPath": "/sfx/05_Phuong_Tien_Dien_Thoai/Tieng_Tut_Tut_Cup_May/Telephone Fast Busy Signal⧸Hang Up Sound Effect.mp3"
          }
        ]
      }
    ]
  },
  {
    "id": "06_Kinh_Di_Tam_Linh_Chuyen_Canh",
    "name": "Kinh dị, Tâm linh & Chuyển cảnh",
    "icon": "Ghost",
    "topics": [
      {
        "id": "Am_Nen_Cang_Thang_U_Am",
        "name": "Âm nền u ám căng thẳng",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Âm nền u ám căng thẳng - Bản âm thanh 1",
            "shortName": "Bản âm thanh 1",
            "topicName": "Âm nền u ám căng thẳng",
            "fileName": "Dark Drones  - Eerie and Tense Atmospheres - Royalty Free Sound Effects.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Am_Nen_Cang_Thang_U_Am/Dark Drones  - Eerie and Tense Atmospheres - Royalty Free Sound Effects.mp3"
          },
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Âm nền u ám căng thẳng - Bản âm thanh 2",
            "shortName": "Bản âm thanh 2",
            "topicName": "Âm nền u ám căng thẳng",
            "fileName": "Suspense Drone - Sound Effect (HQ).mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Am_Nen_Cang_Thang_U_Am/Suspense Drone - Sound Effect (HQ).mp3"
          }
        ]
      },
      {
        "id": "Am_Thanh_Gay_Can_Giut_Minh",
        "name": "Âm thanh giật mình kinh dị (Jumpscare)",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Âm thanh giật mình kinh dị (Jumpscare) - Cú đấm trúng đích",
            "shortName": "Cú đấm trúng đích",
            "topicName": "Âm thanh giật mình kinh dị (Jumpscare)",
            "fileName": "Horror⧸Dramatic Hit then Violin Stinger⧸Screech (Sound Effect).mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Am_Thanh_Gay_Can_Giut_Minh/Horror⧸Dramatic Hit then Violin Stinger⧸Screech (Sound Effect).mp3"
          },
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Âm thanh giật mình kinh dị (Jumpscare) - Cú hù giật bắn mình",
            "shortName": "Cú hù giật bắn mình",
            "topicName": "Âm thanh giật mình kinh dị (Jumpscare)",
            "fileName": "Jumpscare Sound.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Am_Thanh_Gay_Can_Giut_Minh/Jumpscare Sound.mp3"
          }
        ]
      },
      {
        "id": "Hieu_Ung_Chuyen_Canh_Nhe",
        "name": "Chuyển cảnh nhẹ (Whoosh/Swoosh)",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Chuyển cảnh nhẹ (Whoosh/Swoosh) - Vút chuyển cảnh nhanh",
            "shortName": "Vút chuyển cảnh nhanh",
            "topicName": "Chuyển cảnh nhẹ (Whoosh/Swoosh)",
            "fileName": "FREE Transition Sound Effects [Swoosh Pack] (Sam Kolder ｜ Taylor Cut Films ｜ JR .mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Hieu_Ung_Chuyen_Canh_Nhe/FREE Transition Sound Effects [Swoosh Pack] (Sam Kolder ｜ Taylor Cut Films ｜ JR .mp3"
          },
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Chuyển cảnh nhẹ (Whoosh/Swoosh) - Vút chuyển cảnh nhanh",
            "shortName": "Vút chuyển cảnh nhanh",
            "topicName": "Chuyển cảnh nhẹ (Whoosh/Swoosh)",
            "fileName": "Long Cinematic Whoosh Sound Effect.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Hieu_Ung_Chuyen_Canh_Nhe/Long Cinematic Whoosh Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Hieu_Ung_Hoi_Tuong_Qua_Khu",
        "name": "Hồi tưởng quá khứ (Dreaming)",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Hồi tưởng quá khứ (Dreaming)",
            "shortName": "Tiếng đàn huyền ảo hồi tưởng",
            "topicName": "Hồi tưởng quá khứ (Dreaming)",
            "fileName": "Dreaming harp - sound effect.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Hieu_Ung_Hoi_Tuong_Qua_Khu/Dreaming harp - sound effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Bass_Tram_Gay_Cang_Thang",
        "name": "Tiếng Bass trầm rền căng thẳng",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Tiếng Bass trầm rền căng thẳng - Âm bass dội mạnh",
            "shortName": "Âm bass dội mạnh",
            "topicName": "Tiếng Bass trầm rền căng thẳng",
            "fileName": "Cinematic Boom - sound effect - [High quality].mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Tieng_Bass_Tram_Gay_Cang_Thang/Cinematic Boom - sound effect - [High quality].mp3"
          },
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Tiếng Bass trầm rền căng thẳng - Cú đấm trúng đích",
            "shortName": "Cú đấm trúng đích",
            "topicName": "Tiếng Bass trầm rền căng thẳng",
            "fileName": "Hit⧸Boom⧸Impact⧸Thud (Movie Trailer Cinematic) - Sound Effect.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Tieng_Bass_Tram_Gay_Cang_Thang/Hit⧸Boom⧸Impact⧸Thud (Movie Trailer Cinematic) - Sound Effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Thi_Tham_Ma_Quai",
        "name": "Tiếng thì thầm ma quái",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Tiếng thì thầm ma quái - Lời thì thầm lạnh gáy",
            "shortName": "Lời thì thầm lạnh gáy",
            "topicName": "Tiếng thì thầm ma quái",
            "fileName": "Soft Whispering Sound Effect (Fake).mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Tieng_Thi_Tham_Ma_Quai/Soft Whispering Sound Effect (Fake).mp3"
          },
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Tiếng thì thầm ma quái - Lời thì thầm lạnh gáy",
            "shortName": "Lời thì thầm lạnh gáy",
            "topicName": "Tiếng thì thầm ma quái",
            "fileName": "🎵 No copyright free Creepy Eerie Scary Whisper sound effect.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Tieng_Thi_Tham_Ma_Quai/🎵 No copyright free Creepy Eerie Scary Whisper sound effect.mp3"
          }
        ]
      },
      {
        "id": "Tieng_Tre_Con_Cuoi_Ma_Mi",
        "name": "Tiếng trẻ con cười ma mị",
        "items": [
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Tiếng trẻ con cười ma mị - Tiếng cười vang rợn người",
            "shortName": "Tiếng cười vang rợn người",
            "topicName": "Tiếng trẻ con cười ma mị",
            "fileName": "Creepy Child Laughing ⧸ Giggling.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Tieng_Tre_Con_Cuoi_Ma_Mi/Creepy Child Laughing ⧸ Giggling.mp3"
          },
          {
            "id": "c2Z4LzA2X0tpbmhf",
            "name": "Tiếng trẻ con cười ma mị - Tiếng cười vang rợn người",
            "shortName": "Tiếng cười vang rợn người",
            "topicName": "Tiếng trẻ con cười ma mị",
            "fileName": "Creepy Girl Laugh Sound Effect.mp3",
            "relPath": "/sfx/06_Kinh_Di_Tam_Linh_Chuyen_Canh/Tieng_Tre_Con_Cuoi_Ma_Mi/Creepy Girl Laugh Sound Effect.mp3"
          }
        ]
      }
    ]
  }
];
