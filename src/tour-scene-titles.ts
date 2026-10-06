export interface LocalizedSceneTitle {
  readonly th: string;
  readonly en: string;
}

export interface SceneTitleRename {
  readonly id: string;
  readonly before: LocalizedSceneTitle;
  readonly after: LocalizedSceneTitle;
}

function rename(
  id: string,
  beforeTh: string,
  beforeEn: string,
  afterTh: string,
  afterEn: string
): SceneTitleRename {
  return {
    id,
    before: { th: beforeTh, en: beforeEn },
    after: { th: afterTh, en: afterEn }
  };
}

/**
 * Curated bilingual names for route scenes whose former labels exposed internal
 * point numbering. IDs remain stable; only the visitor-facing title changes.
 */
export const SCENE_TITLE_RENAMES = [
  rename('campusRoad1', 'ถนนภายในวิทยาเขต จุดที่ 1', 'Campus Road Point 1', 'ถนนข้างลานอนุสรณ์ รัชกาลที่ 4', 'Road Beside the King Rama IV Memorial Plaza'),
  rename('campusRoad2', 'ถนนภายในวิทยาเขต จุดที่ 2', 'Campus Road Point 2', 'ทางแยกโรงแรมวิลลาวิชาลัย', 'Villa Wichalai Hotel Junction'),
  rename('campusRoad3', 'ถนนภายในวิทยาเขต จุดที่ 3', 'Campus Road Point 3', 'ถนนหน้าคณะบริหารธุรกิจและอุตสาหกรรมบริการ', 'Road in Front of the Faculty of Business Administration and Industrial Services'),
  rename('campusRoad4', 'ถนนภายในวิทยาเขต จุดที่ 4', 'Campus Road Point 4', 'ทางแยกคณะบริหารธุรกิจและอุทยานเทคโนโลยี', 'Business Faculty and Techno Park Junction'),
  rename('campusRoad5', 'ถนนภายในวิทยาเขต จุดที่ 5', 'Campus Road Point 5', 'ถนนหน้าอุทยานเทคโนโลยี', 'Road in Front of KMUTNB Techno Park'),
  rename('campusRoad6', 'ถนนภายในวิทยาเขต จุดที่ 6', 'Campus Road Point 6', 'ทางโค้งระหว่างอุทยานเทคโนโลยีกับหอประชุม', 'Curved Road Between Techno Park and the Auditorium'),
  rename('campusRoad7', 'ถนนภายในวิทยาเขต จุดที่ 7', 'Campus Road Point 7', 'ทางแยกอาคารหอประชุมและกิจการนักศึกษา', 'Auditorium and Student Affairs Junction'),
  rename('campusRoad8', 'เส้นทางภายในวิทยาเขต จุดที่ 8', 'Campus Route Point 8', 'ทางเดินจักรยานข้างอาคารหอประชุม', 'Cycle Path Beside the Auditorium'),
  rename('campusRoad9', 'เส้นทางภายในวิทยาเขต จุดที่ 9', 'Campus Route Point 9', 'ทางเดินจักรยานช่วงแนวต้นไม้', 'Tree-lined Campus Cycle Path'),
  rename('campusRoad10', 'เส้นทางภายในวิทยาเขต จุดที่ 10', 'Campus Route Point 10', 'ทางเดินจักรยานข้างลานกิจกรรม', 'Cycle Path Beside the Activity Lawn'),
  rename('campusRoad11', 'เส้นทางภายในวิทยาเขต จุดที่ 11', 'Campus Route Point 11', 'ถนนเลียบพื้นที่สีเขียวกลางวิทยาเขต', 'Road Along the Central Campus Green'),
  rename('campusRoad12', 'เส้นทางภายในวิทยาเขต จุดที่ 12', 'Campus Route Point 12', 'ทางแยกเส้นทางหอพักนักศึกษา', 'Student Dormitory Route Junction'),
  rename('campusRoad13', 'เส้นทางภายในวิทยาเขต จุดที่ 13', 'Campus Route Point 13', 'ถนนเลียบสวนกลางวิทยาเขต', 'Road Along the Campus Garden'),
  rename('campusRoad14', 'เส้นทางภายในวิทยาเขต จุดที่ 14', 'Campus Route Point 14', 'ทางโค้งก่อนถึงบริเวณหอพระ', 'Curved Road Approaching the Shrine Area'),
  rename('campusRoad15', 'เส้นทางภายในวิทยาเขต จุดที่ 15', 'Campus Route Point 15', 'ทางแยกอาคารเรียนและหอพระ', 'Academic Buildings and Shrine Junction'),
  rename('campusRoad16', 'เส้นทางภายในวิทยาเขต จุดที่ 16', 'Campus Route Point 16', 'ถนนหน้าหอพระหลวงพ่อสิง', 'Road in Front of Luang Pho Sing Shrine'),
  rename('campusRoad17', 'เส้นทางภายในวิทยาเขต จุดที่ 17', 'Campus Route Point 17', 'ทางแยกหอพระและกลุ่มอาคารคณะ', 'Shrine and Faculty Buildings Junction'),
  rename('campusRoad27', 'เส้นทางภายในวิทยาเขต จุดที่ 27', 'Campus Route Point 27', 'ทางเชื่อมคณะอุตสาหกรรมเกษตรดิจิทัล', 'Digital Agro-Industry Faculty Connector'),
  rename('campusRoad18', 'เส้นทางภายในวิทยาเขต จุดที่ 18', 'Campus Route Point 18', 'ถนนเข้าคณะอุตสาหกรรมเกษตรดิจิทัล', 'Access Road to the Faculty of Digital Agro-Industry'),
  rename('campusRoad20', 'เส้นทางบริเวณกลุ่มอาคาร จุดที่ 20', 'Building Area Route Point 20', 'ทางเชื่อมคณะอุตสาหกรรมเกษตรดิจิทัลและอาคารบริหาร', 'Digital Agro-Industry and Administration Building Connector'),
  rename('campusRoad25', 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี จุดที่ 1', 'Faculty of Technology Motorcycle Parking Point 1', 'ลานจอดรถจักรยานยนต์ FITM ฝั่งอาคาร', 'FITM Motorcycle Parking by the Building'),
  rename('campusRoad26', 'ที่จอดรถจักรยานยนต์ในคณะเทคโนโลยี จุดที่ 2', 'Faculty of Technology Motorcycle Parking Point 2', 'ทางเชื่อมลานจอดรถจักรยานยนต์และอาคารสิรินธร', 'Motorcycle Parking and Sirindhorn Building Connector'),
  rename('campusRoad28', 'เส้นทางไปกลุ่มอาคาร จุดที่ 28', 'Building Route Point 28', 'ถนนจากหอพระสู่กลุ่มอาคารคณะ', 'Road from the Shrine to the Faculty Buildings'),
  rename('campusRoad29', 'เส้นทางไปกลุ่มอาคาร จุดที่ 29', 'Building Route Point 29', 'ทางแยกโดมแดงและกลุ่มอาคารคณะ', 'Red Dome and Faculty Buildings Junction'),
  rename('campusRoad30', 'เส้นทางไปกลุ่มอาคาร จุดที่ 30', 'Building Route Point 30', 'ทางแยก FITM และคณะวิศวกรรมศาสตร์', 'FITM and Engineering Faculty Junction'),
  rename('campusRoad32', 'เส้นทางคณะเทคโนโลยี จุดที่ 32', 'FITM Route Point 32', 'ลานจอดรถ FITM ฝั่งทางแยกคณะ', 'FITM Parking by the Faculty Junction'),
  rename('campusRoad33', 'เส้นทางคณะเทคโนโลยี จุดที่ 33', 'FITM Route Point 33', 'ลานจอดรถ FITM ฝั่งสนามหญ้า', 'FITM Parking by the Lawn'),
  rename('campusRoad34', 'เส้นทางคณะเทคโนโลยี จุดที่ 34', 'FITM Route Point 34', 'ลานหน้าอาคาร FITM ฝั่งโถงหลัก', 'FITM Forecourt by the Main Lobby'),
  rename('campusRoad35', 'เส้นทางคณะเทคโนโลยี จุดที่ 35', 'FITM Route Point 35', 'ทางเดินหน้าอาคาร FITM', 'Walkway in Front of the FITM Building'),
  rename('campusRoad37', 'เส้นทางคณะเทคโนโลยี จุดที่ 37', 'FITM Route Point 37', 'ลานจอดรถ FITM ฝั่งโรงอาหาร', 'FITM Parking by the University Cafeteria'),
  rename('campusRoad38', 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 38', 'Engineering Route Point 38', 'ทางแยกโรงอาหารและคณะวิศวกรรมศาสตร์', 'Cafeteria and Engineering Faculty Junction'),
  rename('campusRoad39', 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 39', 'Engineering Route Point 39', 'ถนนเข้าคณะวิศวกรรมศาสตร์', 'Access Road to the Faculty of Engineering'),
  rename('campusRoad40', 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 40', 'Engineering Route Point 40', 'ทางโค้งภายในกลุ่มอาคารวิศวกรรมศาสตร์', 'Curved Road in the Engineering Building Area'),
  rename('campusRoad41', 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 41', 'Engineering Route Point 41', 'ถนนเลียบอาคารวิศวกรรมศาสตร์', 'Road Along the Engineering Buildings'),
  rename('campusRoad42', 'เส้นทางคณะวิศวกรรมศาสตร์ จุดที่ 42', 'Engineering Route Point 42', 'ลานหน้าอาคารวิศวกรรมศาสตร์', 'Engineering Building Forecourt'),
  rename('campusRoad44', 'ทางเดินบริเวณโดมแดง จุดที่ 1', 'Red Dome Walkway Point 1', 'ทางเดินมีหลังคาข้างโดมแดง', 'Covered Walkway Beside the Red Dome'),
  rename('campusRoad47', 'ทางเดินบริเวณโดมแดง จุดที่ 2', 'Red Dome Walkway Point 2', 'ทางเดินสนามหญ้าข้างโดมแดง', 'Lawn Walkway Beside the Red Dome'),
  rename('campusRoad48', 'ทางเดินบริเวณโดมแดง จุดที่ 3', 'Red Dome Walkway Point 3', 'ทางเดินจากโดมแดงสู่ทางแยกกลุ่มอาคาร', 'Walkway from the Red Dome to the Faculty Junction'),
  rename('campusRoad49', 'ทางเดินบริเวณโดมแดง จุดที่ 4', 'Red Dome Walkway Point 4', 'ทางแยกทางเดินโดมแดงและ FITM', 'Red Dome and FITM Walkway Junction'),
  rename('campusRoad50', 'ทางเดินบริเวณโดมแดง จุดที่ 5', 'Red Dome Walkway Point 5', 'ทางเชื่อมโดมแดงและคณะวิศวกรรมศาสตร์', 'Red Dome and Engineering Faculty Connector'),
  rename('campusRoad52', 'เส้นทางไปหอพักนักศึกษา จุดที่ 1', 'Student Dormitory Route Point 1', 'ถนนจากทางแยกกลางวิทยาเขตสู่หอพัก', 'Road from the Central Junction to the Dormitories'),
  rename('campusRoad53', 'เส้นทางไปหอพักนักศึกษา จุดที่ 2', 'Student Dormitory Route Point 2', 'ถนนเลียบพื้นที่สีเขียวเส้นทางหอพัก', 'Dormitory Road Along the Green Area'),
  rename('campusRoad54', 'เส้นทางไปหอพักนักศึกษา จุดที่ 3', 'Student Dormitory Route Point 3', 'ทางโค้งเส้นทางหอพักนักศึกษา', 'Curved Road Toward the Student Dormitories'),
  rename('campusRoad55', 'เส้นทางไปหอพักนักศึกษา จุดที่ 4', 'Student Dormitory Route Point 4', 'ถนนช่วงกลางเส้นทางหอพักนักศึกษา', 'Midway Road to the Student Dormitories'),
  rename('campusRoad56', 'เส้นทางไปหอพักนักศึกษา จุดที่ 5', 'Student Dormitory Route Point 5', 'ถนนใกล้กลุ่มอาคารหอพัก', 'Road Near the Dormitory Buildings'),
  rename('campusRoad57', 'เส้นทางไปหอพักนักศึกษา จุดที่ 6', 'Student Dormitory Route Point 6', 'ทางแยกก่อนถึงหอพักชาย', 'Junction Approaching the Male Dormitory'),
  rename('campusRoad58', 'เส้นทางไปหอพักนักศึกษา จุดที่ 7', 'Student Dormitory Route Point 7', 'ถนนหน้าหอพักชาย', 'Road in Front of the Male Dormitory'),

  rename('fitmInterior1', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 1', 'Inside FITM Point 1', 'โถงทางเข้าอาคาร FITM', 'FITM Main Entrance Lobby'),
  rename('fitmInterior2', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 2', 'Inside FITM Point 2', 'โถงหน้าห้องพวงคราง 2', 'Lobby by Phuang Khrang Room 2'),
  rename('fitmInterior3', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 3', 'Inside FITM Point 3', 'ทางเดินเชื่อมห้องประชุมชั้น 1', 'First-floor Meeting Room Corridor'),
  rename('fitmInterior4', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 4', 'Inside FITM Point 4', 'โถงหน้าห้องพวงคราม 1', 'Lobby by Phuang Khram Room 1'),
  rename('fitmInterior5', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 5', 'Inside FITM Point 5', 'โถงมินิมาร์ท FITM', 'FITM Minimart Lobby'),
  rename('fitmInterior6', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 6', 'Inside FITM Point 6', 'โถงห้องถ่ายเอกสารและชมรมนักศึกษา', 'Copy Room and Student Club Lobby'),
  rename('fitmInterior7', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 7', 'Inside FITM Point 7', 'ทางแยกห้อง Co-working Space', 'Co-working Space Junction'),
  rename('fitmInterior8', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 8', 'Inside FITM Point 8', 'โถงบันได FITM ฝั่งมินิมาร์ท', 'FITM Stair Lobby by the Minimart'),
  rename('fitmInterior9', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 9', 'Inside FITM Point 9', 'โถงกิจกรรมนักศึกษาชั้น 1', 'First-floor Student Activity Lobby'),
  rename('fitmInterior10', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 10', 'Inside FITM Point 10', 'โถงงานบริการการศึกษา FITM', 'FITM Educational Services Lobby'),
  rename('fitmInterior11', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 11', 'Inside FITM Point 11', 'ลานกลางอาคาร FITM', 'FITM Central Courtyard'),
  rename('fitmInterior12', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 12', 'Inside FITM Point 12', 'โถงประชาสัมพันธ์ FITM', 'FITM Information Lobby'),
  rename('fitmInterior13', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 13', 'Inside FITM Point 13', 'โถงห้องพยาบาลและบันได FITM', 'FITM First Aid Room and Stair Lobby'),
  rename('fitmInterior14', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 14', 'Inside FITM Point 14', 'ทางเดินสู่ช็อปปฏิบัติการ FITM', 'Corridor to the FITM Workshop Area'),
  rename('fitmInterior15', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 15', 'Inside FITM Point 15', 'ทางเข้าช็อป ITI', 'ITI Workshop Entrance'),
  rename('fitmInterior16', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 16', 'Inside FITM Point 16', 'ทางเชื่อมช็อป ITI และห้องปฏิบัติการเครื่องกล', 'ITI and Mechanical Laboratory Connector'),
  rename('fitmInterior17', 'ภายในคณะเทคโนโลยีและการจัดการอุตสาหกรรม จุดที่ 17', 'Inside FITM Point 17', 'ทางเข้าห้องปฏิบัติการเครื่องกล', 'Mechanical Laboratory Entrance'),

  rename('fitmCoworkingSpace1', 'ห้อง Co-working Space จุดที่ 1', 'Co-working Space Point 1', 'ทางเข้าห้อง Co-working Space', 'Co-working Space Entrance'),
  rename('fitmCoworkingSpace2', 'ห้อง Co-working Space จุดที่ 2', 'Co-working Space Point 2', 'พื้นที่ทำงานร่วม Co-working Space', 'Co-working Space Collaborative Work Area'),
  rename('fitmCoworkingSpace3', 'ห้อง Co-working Space จุดที่ 3', 'Co-working Space Point 3', 'โซนคอมพิวเตอร์และเคาน์เตอร์ Co-working Space', 'Co-working Space Computer and Service Counter Area'),

  rename('itiElectricalLab1', 'ช็อป ITI ห้องปฏิบัติการไฟฟ้า จุดที่ 1', 'ITI Electrical Laboratory Point 1', 'พื้นที่ปฏิบัติการไฟฟ้าหลัก ช็อป ITI', 'ITI Main Electrical Laboratory Area'),
  rename('itiElectricalLab2', 'ช็อป ITI ห้องปฏิบัติการไฟฟ้า จุดที่ 2', 'ITI Electrical Laboratory Point 2', 'โถงทางเข้าห้องปฏิบัติการไฟฟ้า ช็อป ITI', 'ITI Electrical Laboratory Entrance Lobby'),
  rename('itiElectricalLab3', 'ช็อป ITI ห้องปฏิบัติการไฟฟ้า จุดที่ 3', 'ITI Electrical Laboratory Point 3', 'โซนเครื่องมือห้องปฏิบัติการไฟฟ้า ช็อป ITI', 'ITI Electrical Laboratory Equipment Area'),
  rename('mechanicalLab1', 'ห้องปฏิบัติการเครื่องกล จุดที่ 1', 'Mechanical Laboratory Point 1', 'โถงภายในห้องปฏิบัติการเครื่องกล', 'Mechanical Laboratory Interior Lobby'),
  rename('mechanicalLab2', 'ห้องปฏิบัติการเครื่องกล จุดที่ 2', 'Mechanical Laboratory Point 2', 'พื้นที่ปฏิบัติการเครื่องกลหลัก', 'Main Mechanical Laboratory Area'),
  rename('mechanicalLab3', 'ห้องปฏิบัติการเครื่องกล จุดที่ 3', 'Mechanical Laboratory Point 3', 'โซนเครื่องจักรห้องปฏิบัติการเครื่องกล', 'Mechanical Laboratory Machinery Area'),

  rename('fitmFloor2Point1', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 1', 'Inside FITM, Floor 2, Point 1', 'โถงบันไดหลัก FITM ชั้น 2', 'FITM Main Stair Lobby, Floor 2'),
  rename('fitmFloor2Point2', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 2', 'Inside FITM, Floor 2, Point 2', 'ทางเดินฝั่งห้องเรียน FITM ชั้น 2', 'FITM Classroom-side Corridor, Floor 2'),
  rename('fitmFloor2Point2A', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 2A', 'Inside FITM, Floor 2, Point 2A', 'โถงพักคอยและบันได FITM ชั้น 2', 'FITM Waiting and Stair Lobby, Floor 2'),
  rename('fitmFloor2Point3', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 3', 'Inside FITM, Floor 2, Point 3', 'ทางเดินฝั่งห้องปฏิบัติการ FITM ชั้น 2', 'FITM Laboratory-side Corridor, Floor 2'),
  rename('fitmFloor2Point4', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 4', 'Inside FITM, Floor 2, Point 4', 'โถงบันไดรอง FITM ชั้น 2', 'FITM Secondary Stair Lobby, Floor 2'),
  rename('fitmFloor2Point5', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 5', 'Inside FITM, Floor 2, Point 5', 'ทางเดินวงแหวนฝั่งด้านใน FITM ชั้น 2', 'FITM Inner Ring Corridor, Floor 2'),
  rename('fitmFloor2Point6', 'ภายในอาคาร FITM ชั้น 2 จุดที่ 6', 'Inside FITM, Floor 2, Point 6', 'ทางเดินวงแหวนฝั่งระเบียง FITM ชั้น 2', 'FITM Balcony-side Ring Corridor, Floor 2'),
  rename('fitmFloor3Point1', 'ภายในอาคาร FITM ชั้น 3 จุดที่ 1', 'Inside FITM, Floor 3, Point 1', 'โถงบันไดหลัก FITM ชั้น 3', 'FITM Main Stair Lobby, Floor 3'),
  rename('fitmFloor3Point2', 'ภายในอาคาร FITM ชั้น 3 จุดที่ 2', 'Inside FITM, Floor 3, Point 2', 'หน้าห้องผู้บริหาร FITM ชั้น 3', 'FITM Executive Office Area, Floor 3'),
  rename('fitmFloor3Point3', 'ภายในอาคาร FITM ชั้น 3 จุดที่ 3', 'Inside FITM, Floor 3, Point 3', 'โถงพักคอย FITM ชั้น 3', 'FITM Waiting Lobby, Floor 3'),
  rename('fitmFloor3Point4', 'ภายในอาคาร FITM ชั้น 3 จุดที่ 4', 'Inside FITM, Floor 3, Point 4', 'ทางแยกบันไดเชื่อม FITM ชั้น 3', 'FITM Connecting Stair Junction, Floor 3'),
  rename('fitmFloor3Point5', 'ภายในอาคาร FITM ชั้น 3 จุดที่ 5', 'Inside FITM, Floor 3, Point 5', 'โถงบันไดรอง FITM ชั้น 3', 'FITM Secondary Stair Lobby, Floor 3'),
  rename('fitmFloor4Point1', 'ภายในอาคาร FITM ชั้น 4 จุดที่ 1', 'Inside FITM, Floor 4, Point 1', 'โถงบันไดหลัก FITM ชั้น 4', 'FITM Main Stair Lobby, Floor 4'),
  rename('fitmFloor4Point2', 'ภายในอาคาร FITM ชั้น 4 จุดที่ 2', 'Inside FITM, Floor 4, Point 2', 'ทางเดินฝั่งห้องเรียน FITM ชั้น 4', 'FITM Classroom-side Corridor, Floor 4'),
  rename('fitmFloor4Point3', 'ภายในอาคาร FITM ชั้น 4 จุดที่ 3', 'Inside FITM, Floor 4, Point 3', 'โถงบันไดรอง FITM ชั้น 4', 'FITM Secondary Stair Lobby, Floor 4'),
  rename('fitmFloor4Point4', 'ภายในอาคาร FITM ชั้น 4 จุดที่ 4', 'Inside FITM, Floor 4, Point 4', 'ทางเดินหน้าห้องเรียน FITM ชั้น 4', 'FITM Corridor by the Classrooms, Floor 4'),
  rename('fitmFloor4Point5', 'ภายในอาคาร FITM ชั้น 4 จุดที่ 5', 'Inside FITM, Floor 4, Point 5', 'ทางเดินฝั่งห้อง 4-20 FITM ชั้น 4', 'FITM Corridor by Room 4-20, Floor 4'),
  rename('fitmFloor4Point6', 'ภายในอาคาร FITM ชั้น 4 จุดที่ 6', 'Inside FITM, Floor 4, Point 6', 'ทางเดินฝั่งห้องปฏิบัติการ 4-01 FITM ชั้น 4', 'FITM Corridor by Laboratory 4-01, Floor 4'),

  rename('sirindhornLibraryFloor1Point1', 'อาคารสิรินธร ชั้น 1 จุดที่ 1', 'Sirindhorn Building, Floor 1, Point 1', 'โถงทางเข้าอาคารสิรินธร ชั้น 1', 'Sirindhorn Building Entrance Lobby, Floor 1'),
  rename('sirindhornLibraryFloor1Point2', 'อาคารสิรินธร ชั้น 1 จุดที่ 2', 'Sirindhorn Building, Floor 1, Point 2', 'พื้นที่ต้อนรับอาคารสิรินธร ชั้น 1', 'Sirindhorn Building Reception Area, Floor 1')
] as const satisfies readonly SceneTitleRename[];

const sceneTitleRenameById = new Map<string, SceneTitleRename>(
  SCENE_TITLE_RENAMES.map((item) => [item.id, item])
);

export function containsLegacySceneOrdinal(title: LocalizedSceneTitle): boolean {
  return title.th.includes('จุดที่') || /\bPoint\b/i.test(title.en);
}

function equalTitle(left: LocalizedSceneTitle, right: LocalizedSceneTitle): boolean {
  return left.th === right.th && left.en === right.en;
}

export function resolveBootstrapSceneTitle(
  sceneId: string,
  current: LocalizedSceneTitle
): LocalizedSceneTitle {
  return sceneTitleRenameById.get(sceneId)?.after ?? current;
}

export class SceneTitleSyncConflictError extends Error {
  readonly conflicts: readonly string[];

  constructor(conflicts: readonly string[]) {
    super(`Scene title sync stopped:\n${conflicts.map((item) => `- ${item}`).join('\n')}`);
    this.name = 'SceneTitleSyncConflictError';
    this.conflicts = conflicts;
  }
}

interface SceneTitleRecord {
  readonly id: string;
  title: { th: string; en: string };
}

interface SceneTitleStructure {
  scenes: SceneTitleRecord[];
}

export interface SceneTitleMergeResult<T> {
  readonly data: T;
  readonly changed: boolean;
  readonly updatedSceneIds: readonly string[];
  readonly preservedSceneIds: readonly string[];
}

/** Applies only known title changes and preserves compliant Admin-authored names. */
export function mergeSceneTitleRenames<T extends SceneTitleStructure>(input: T): SceneTitleMergeResult<T> {
  const data = structuredClone(input);
  const scenes = new Map(data.scenes.map((scene) => [scene.id, scene]));
  const conflicts: string[] = [];
  const updatedSceneIds: string[] = [];
  const preservedSceneIds: string[] = [];

  for (const item of SCENE_TITLE_RENAMES) {
    const scene = scenes.get(item.id);
    if (!scene) {
      conflicts.push(`ไม่พบ Scene ID ${item.id}`);
      continue;
    }
    if (equalTitle(scene.title, item.after)) continue;
    if (equalTitle(scene.title, item.before)) {
      scene.title = { ...item.after };
      updatedSceneIds.push(item.id);
      continue;
    }
    if (containsLegacySceneOrdinal(scene.title)) {
      conflicts.push(`${item.id} มีชื่อที่ Admin แก้เองแต่ยังมีคำว่า จุดที่/Point`);
      continue;
    }
    preservedSceneIds.push(item.id);
  }

  const titleOwners = { th: new Map<string, string>(), en: new Map<string, string>() };
  for (const scene of data.scenes) {
    if (containsLegacySceneOrdinal(scene.title)) {
      conflicts.push(`${scene.id} ยังมีคำว่า จุดที่/Point`);
    }
    for (const locale of ['th', 'en'] as const) {
      const normalized = scene.title[locale].trim().toLocaleLowerCase();
      const owner = titleOwners[locale].get(normalized);
      if (owner && owner !== scene.id) {
        conflicts.push(`ชื่อ ${locale.toUpperCase()} ซ้ำระหว่าง ${owner} และ ${scene.id}`);
      } else {
        titleOwners[locale].set(normalized, scene.id);
      }
    }
  }

  if (conflicts.length) throw new SceneTitleSyncConflictError([...new Set(conflicts)]);
  return {
    data,
    changed: updatedSceneIds.length > 0,
    updatedSceneIds,
    preservedSceneIds
  };
}
