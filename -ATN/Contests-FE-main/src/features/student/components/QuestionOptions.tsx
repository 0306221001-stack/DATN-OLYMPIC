import React from "react";
import {
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Chip,
  Alert,
  AlertTitle,
  Button,
} from "@mui/material";
import { CheckCircle, Cancel, Send } from "@mui/icons-material";

interface QuestionOptionsProps {
  options: string[];
  selectedAnswer: string;
  isSubmitted: boolean;
  isEliminated: boolean;
  isBanned: boolean;
  banMessage: string;
  eliminationMessage: string;
  answerResult: {
    isCorrect: boolean;
    correctAnswer: string | number[];
    explanation?: string;
    score: number;
    eliminated: boolean;
    questionOrder: number;
    submittedAt: string;
  } | null;
  canShowResult: boolean;
  isApiSubmitting: boolean;
  isTimerRunning?: boolean;
  isRescued?: boolean; // 🆕 NEW: Prop để check rescue mode
  isInRescueMode?: boolean; // 🆕 NEW: Prop để check rescue mode
  onAnswerSelect: (answer: string) => void;
  onSubmitAnswer: () => void;
}

const QuestionOptions: React.FC<QuestionOptionsProps> = ({
  options,
  selectedAnswer,
  isSubmitted,
  isEliminated,
  isBanned,
  answerResult,
  canShowResult,
  isApiSubmitting,
  isTimerRunning = false,
  isRescued = false, // 🆕 NEW: Default false
  isInRescueMode = false, // 🆕 NEW: Default false
  onAnswerSelect,
  onSubmitAnswer,
}) => {
  // 🔥 NEW: Điều kiện hiển thị options - hiển thị khi:
  // 1. Chưa bị cấm HOẶC đã được cứu trợ
  // 2. Chưa bị loại HOẶC (bị loại nhưng có kết quả để hiển thị)
  const shouldShowOptions =
    (!isBanned || isRescued) &&
    (!isEliminated || (isEliminated && canShowResult && answerResult));

  // 🔥 NEW: Điều kiện disable tương tác - disable khi:
  // 1. Đã submit
  // 2. Bị loại và chưa được cứu trợ
  // 3. Bị cấm và chưa được cứu trợ
  // 4. Đang trong rescue mode
  const shouldDisableInteraction =
    isSubmitted ||
    (isEliminated && !isRescued) ||
    (isBanned && !isRescued) ||
    isInRescueMode ||
    isRescued;

  const getOptionClass = (option: string) => {
    // 🔥 NEW: Nếu đang rescue mode, hiển thị màu xám
    if (isInRescueMode || isRescued) {
      return "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-60";
    }

    if (!canShowResult) {
      return selectedAnswer === option
        ? "bg-blue-100 border-blue-500 text-blue-800 shadow-md"
        : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300";
    }

    // Đã submit - hiển thị kết quả với màu sắc rõ ràng
    const isCorrectAnswer = option === answerResult?.correctAnswer;
    const isUserSelection = option === selectedAnswer;

    if (isCorrectAnswer) {
      return "bg-green-100 border-green-500 text-green-800 shadow-lg border-2";
    }

    if (isUserSelection && !answerResult?.isCorrect) {
      return "bg-red-100 border-red-500 text-red-800 shadow-lg border-2";
    }

    return "bg-gray-50 border-gray-200 text-gray-500 opacity-60";
  };

  const getResultIcon = (option: string) => {
    if (!canShowResult || !answerResult) return null;

    const isCorrectAnswer = option === answerResult.correctAnswer;
    const isUserSelection = option === selectedAnswer;

    if (isCorrectAnswer) {
      return (
        <Box className="flex items-center gap-2">
          <CheckCircle className="text-green-600 text-xl" />
          <Chip
            label="ĐÚNG"
            size="small"
            className="bg-green-600 text-white font-bold"
          />
        </Box>
      );
    }

    if (isUserSelection && !answerResult.isCorrect) {
      return (
        <Box className="flex items-center gap-2">
          <Cancel className="text-red-600 text-xl" />
          <Chip
            label="SAI"
            size="small"
            className="bg-red-600 text-white font-bold"
          />
        </Box>
      );
    }

    return null;
  };

  return (
    <Box className="space-y-4">
      {/* 🔥 NEW: Hiển thị options (bao gồm cả khi bị loại nhưng có kết quả) */}
      {shouldShowOptions && (
        <FormControl component="fieldset" className="w-full">
          <RadioGroup
            value={selectedAnswer}
            onChange={(e) =>
              !shouldDisableInteraction && onAnswerSelect(e.target.value)
            }
          >
            <Box className="space-y-3">
              {options?.map((option, index) => (
                <Box
                  key={index}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    shouldDisableInteraction
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  } ${getOptionClass(option)}`}
                  onClick={() =>
                    !shouldDisableInteraction && onAnswerSelect(option)
                  }
                >
                  <Box className="flex items-center justify-between">
                    <FormControlLabel
                      value={option}
                      control={<Radio disabled={shouldDisableInteraction} />}
                      label={
                        <Typography variant="body1" className="font-medium">
                          {String.fromCharCode(65 + index)}. {option}
                        </Typography>
                      }
                      className="m-0 flex-1"
                    />
                    {getResultIcon(option)}
                  </Box>
                </Box>
              ))}
            </Box>
          </RadioGroup>
        </FormControl>
      )}

      {/* 🔥 NEW: Hiển thị thông báo ban (chỉ khi bị cấm và chưa được cứu trợ) */}
      {isBanned && !isRescued && (
        <Alert
          severity="error"
          icon={<Cancel />}
          className="border-2 border-red-500 bg-red-50 mb-4"
        >
          <AlertTitle>Bị cấm tham gia</AlertTitle>
          <Box className="space-y-3">
            <Typography variant="h6" className="font-bold text-red-800">
              Bạn đã bị cấm tham gia vì vi phạm quy chế!
            </Typography>
          </Box>
        </Alert>
      )}

      {/* 🔥 NEW: Hiển thị thông báo elimination (chỉ khi bị loại và không có kết quả) */}
      {isEliminated && !canShowResult && !answerResult && (
        <Alert
          severity="warning"
          icon={<Cancel />}
          className="border-2 border-orange-500 bg-orange-50 mb-4"
        >
          <AlertTitle>Đã bị loại</AlertTitle>
          <Box className="space-y-3">
            <Typography variant="h6" className="font-bold text-blue-800">
              Bạn có thể được hồi sinh!
            </Typography>

            <Typography variant="body2" className="text-blue-800">
              💡 Đừng rời đi nhé
            </Typography>
          </Box>
        </Alert>
      )}

      {/* 🆕 NEW: Hiển thị thông báo rescue mode */}
      {(isInRescueMode || isRescued) && (
        <Alert
          severity="info"
          className="border-2 border-blue-500 bg-blue-50 mb-4"
        >
          <AlertTitle>🎉 Đang trong chế độ cứu trợ</AlertTitle>
          <Typography variant="body2" className="text-blue-700">
            Bạn đang được cứu trợ. Vui lòng chờ câu hỏi tiếp theo...
          </Typography>
        </Alert>
      )}

      {/* Nút submit */}
      {/* 🔥 NEW: Ẩn submit button nếu thí sinh bị loại, bị cấm hoặc đang rescue */}
      {!isSubmitted &&
        (!isEliminated || isRescued) &&
        (!isBanned || isRescued) &&
        !isInRescueMode &&
        !isRescued && (
          <Box className="flex justify-end mt-4">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Send />}
              onClick={onSubmitAnswer}
              disabled={!selectedAnswer || isApiSubmitting || !isTimerRunning}
              className="px-8 py-3"
            >
              {isApiSubmitting
                ? "Đang xử lý..."
                : isTimerRunning
                ? "Xác nhận"
                : "Chờ bắt đầu tính giờ"}
            </Button>
          </Box>
        )}
    </Box>
  );
};

export default QuestionOptions;
