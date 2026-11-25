import {
  Role,
  QuestionType,
  Difficulty,
  ContestStatus,
  ContestantStatus,
  ContestantMatchStatus,
  RescueType,
  RescueStatus,
  AwardType,
  ControlKey,
  ControlValue,
} from "@/constants/enum";

interface EnumOption {
  label: string;
  value: string;
}

interface EnumData {
  name: string;
  values: Record<string, string>;
  options: EnumOption[];
}

export default class EnumService {
  private static enumMap = {
    Role,
    QuestionType,
    Difficulty,
    ContestStatus,
    ContestantStatus,
    ContestantMatchStatus,
    RescueType,
    RescueStatus,
    AwardType,
    ControlKey,
    ControlValue,
  };

  private static enumLabels: Record<string, Record<string, string>> = {
    Role: {
      Admin: "Quản trị viên",
      Judge: "Giám khảo",
    },
    QuestionType: {
      multiple_choice: "Trắc nghiệm",
      essay: "Tự luận",
      image: "Hình ảnh",
      audio: "Âm thanh",
      video: "Video",
    },
    Difficulty: {
      Alpha: "Alpha",
      Beta: "Beta",
      Rc: "Rc",
      Gold: "Gold",
    },
    ContestStatus: {
      upcoming: "Sắp diễn ra",
      ongoing: "Đang diễn ra",
      finished: "Đã kết thúc",
    },
    ContestantStatus: {
      compete: "Thi đấu",
      eliminate: "Bị loại",
      advanced: "Qua vòng",
    },
    ContestantMatchStatus: {
      not_started: "Chưa bắt đầu",
      in_progress: "Đang tiến hành",
      confirmed1: "Xác nhận 1",
      confirmed2: "Xác nhận 2",
      eliminated: "Bị loại",
      rescued: "Được cứu",
      banned: "Bị cấm",
      completed: "Hoàn thành",
    },
    RescueType: {
      resurrected: "Hồi sinh",
      lifelineUsed: "Phao cứu sinh",
    },
    RescueStatus: {
      notUsed: "Chưa sử dụng",
      used: "Đã sử dụng",
      passed: "Đã qua",
    },
    AwardType: {
      firstPrize: "Giải nhất",
      secondPrize: "Giải nhì",
      thirdPrize: "Giải ba",
      fourthPrize: "Giải tư",
      impressiveVideo: "Video ấn tượng",
      excellentVideo: "Video xuất sắc",
    },
    ControlKey: {
      background: "Nền",
      question: "Câu hỏi",
      questionInfo: "Thông tin câu hỏi",
      answer: "Đáp án",
      matchDiagram: "Sơ đồ trận đấu",
      explanation: "Giải thích",
      firstPrize: "Giải nhất",
      secondPrize: "Giải nhì",
      thirdPrize: "Giải ba",
      fourthPrize: "Giải tư",
      impressiveVideo: "Video ấn tượng",
      excellentVideo: "Video xuất sắc",
      allPrize: "Tất cả giải",
      topWin: "Top thắng",
      listEliminated: "Danh sách bị loại",
      listRescued: "Danh sách được cứu",
      video: "Video",
      audio: "Audio",
      image: "Hình ảnh",
    },
    ControlValue: {
      start: "Bắt đầu",
      pause: "Tạm dừng",
      reset: "Đặt lại",
      zoomIn: "Phóng to",
      zoomOut: "Thu nhỏ",
    },
  };

  /**
   * Get all available enums
   */
  static async getAllEnums(): Promise<Record<string, EnumData>> {
    const result: Record<string, EnumData> = {};

    for (const [enumName, enumObject] of Object.entries(this.enumMap)) {
      result[enumName] = {
        name: enumName,
        values: enumObject as Record<string, string>,
        options: this.getEnumOptionsSync(enumName),
      };
    }

    return result;
  }

  /**
   * Get specific enum by name
   */
  static async getEnumByName(enumName: string): Promise<EnumData | null> {
    const enumObject = this.enumMap[enumName as keyof typeof this.enumMap];

    if (!enumObject) {
      return null;
    }

    return {
      name: enumName,
      values: enumObject as Record<string, string>,
      options: this.getEnumOptionsSync(enumName),
    };
  }

  /**
   * Get enum values as array
   */
  static async getEnumValues(enumName: string): Promise<string[] | null> {
    const enumObject = this.enumMap[enumName as keyof typeof this.enumMap];

    if (!enumObject) {
      return null;
    }

    return Object.values(enumObject);
  }

  /**
   * Get enum options for dropdowns
   */
  static async getEnumOptions(enumName: string): Promise<EnumOption[] | null> {
    const enumObject = this.enumMap[enumName as keyof typeof this.enumMap];

    if (!enumObject) {
      return null;
    }

    return this.getEnumOptionsSync(enumName);
  }

  /**
   * Get enum options synchronously (internal helper)
   */
  private static getEnumOptionsSync(enumName: string): EnumOption[] {
    const enumObject = this.enumMap[enumName as keyof typeof this.enumMap];
    const labels = this.enumLabels[enumName] || {};

    if (!enumObject) {
      return [];
    }

    return Object.entries(enumObject).map(([key, value]) => ({
      label: labels[value] || labels[key] || key,
      value: value as string,
    }));
  }

  /**
   * Get list of available enum names
   */
  static async getEnumNames(): Promise<string[]> {
    return Object.keys(this.enumMap);
  }

  /**
   * Check if enum exists
   */
  static async enumExists(enumName: string): Promise<boolean> {
    return enumName in this.enumMap;
  }
}
