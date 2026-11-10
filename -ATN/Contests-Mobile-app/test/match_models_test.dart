import 'package:contests_mobile_app/features/judge/domain/judge_models.dart';
import 'package:contests_mobile_app/features/match/domain/match_models.dart';
import 'package:contests_mobile_app/features/match/domain/match_snapshot.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('QuestionPayload', () {
    test('đọc câu trắc nghiệm từ currentQuestionData', () {
      final QuestionPayload question =
          QuestionPayload.fromQuestionData(<String, dynamic>{
        'order': 3,
        'question': <String, dynamic>{
          'id': 42,
          'content': '1 + 1 = ?',
          'questionType': 'multiple_choice',
          'options': <String>['1', '2', '3', '4'],
          'defaultTime': 20,
          'score': 2,
        },
      });

      expect(question.id, 42);
      expect(question.order, 3);
      expect(question.options.length, 4);
      expect(question.defaultTime, 20);
      expect(question.isEssay, isFalse);
    });

    test('options là chuỗi JSON vẫn đọc được', () {
      final QuestionPayload question =
          QuestionPayload.fromQuestionData(<String, dynamic>{
        'order': 1,
        'question': <String, dynamic>{
          'id': 1,
          'content': 'Chọn',
          'options': '["A","B"]',
        },
      });
      expect(question.options, <String>['A', 'B']);
    });

    test('câu không có phương án là tự luận', () {
      final QuestionPayload question =
          QuestionPayload.fromQuestionData(<String, dynamic>{
        'order': 2,
        'question': <String, dynamic>{
          'id': 7,
          'content': 'Thủ đô của Việt Nam?',
          'questionType': 'essay',
        },
      });
      expect(question.isEssay, isTrue);
    });

    test('thiếu question thì ném FormatException', () {
      expect(
        () => QuestionPayload.fromQuestionData(<String, dynamic>{'order': 1}),
        throwsFormatException,
      );
    });
  });

  group('MatchLiveState', () {
    const QuestionPayload question = QuestionPayload(
      id: 1,
      order: 1,
      content: 'Q',
      questionType: 'multiple_choice',
      options: <String>['A', 'B'],
      defaultTime: 10,
      score: 1,
    );

    test('chỉ được trả lời khi đang thi, chưa nộp và chưa hết giờ', () {
      const MatchLiveState running = MatchLiveState(
        phase: MatchPhase.running,
        question: question,
      );
      expect(running.canAnswer, isTrue);
      expect(running.copyWith(hasSubmitted: true).canAnswer, isFalse);
      expect(running.copyWith(timeIsUp: true).canAnswer, isFalse);
      expect(
        running.copyWith(status: ContestantPlayStatus.eliminated).canAnswer,
        isFalse,
      );
      expect(
        running.copyWith(status: ContestantPlayStatus.banned).canAnswer,
        isFalse,
      );
    });

    test('kết quả chỉ hiện sau khi hết giờ', () {
      const AnswerResult result = AnswerResult(
        isCorrect: false,
        eliminated: true,
        score: 0,
        questionOrder: 1,
      );
      const MatchLiveState state = MatchLiveState(
        phase: MatchPhase.running,
        question: question,
        result: result,
      );
      expect(state.canShowResult, isFalse);
      expect(state.copyWith(timeIsUp: true).canShowResult, isTrue);
    });

    test('chỉ giữ thí sinh của trận trong phòng khi trận đang diễn ra', () {
      const MatchLiveState inMatch =
          MatchLiveState(matchInProgress: true, registrationNumber: 2);
      expect(inMatch.mustStay, isTrue);
      // Chưa bắt đầu hoặc đã kết thúc.
      expect(inMatch.copyWith(matchInProgress: false).mustStay, isFalse);
      // Không có số báo danh: không thi trận này.
      expect(const MatchLiveState(matchInProgress: true).mustStay, isFalse);
    });
  });

  group('AnswerResult / MatchSnapshot', () {
    test('đọc kết quả chấm điểm', () {
      final AnswerResult result = AnswerResult.fromJson(<String, dynamic>{
        'isCorrect': false,
        'eliminated': true,
        'score': 0,
        'questionOrder': 4,
        'correctAnswer': 'B',
      });
      expect(result.eliminated, isTrue);
      expect(result.correctAnswer, 'B');
    });

    test('đọc ảnh chụp trạng thái trận', () {
      final MatchSnapshot snapshot = MatchSnapshot.fromJson(<String, dynamic>{
        'matchData': <String, dynamic>{
          'matchId': 5,
          'matchName': 'Trận 1',
          'status': 'ongoing',
          'currentQuestion': 2,
          'remainingTime': 15,
        },
        'contestantStatus': 'eliminated',
        'results': <Map<String, dynamic>>[
          <String, dynamic>{'questionOrder': 1, 'isCorrect': true},
          <String, dynamic>{'questionOrder': 2, 'isCorrect': false},
        ],
      });
      expect(snapshot.isOngoing, isTrue);
      expect(snapshot.contestantStatus, ContestantPlayStatus.eliminated);
      expect(snapshot.answeredOrders, <int>{1, 2});
      expect(snapshot.correctCount, 1);
    });
  });

  group('JudgeContestant', () {
    test('sắp xếp theo số báo danh và bỏ bản ghi hỏng', () {
      final List<JudgeContestant> list = JudgeContestant.listFrom(<dynamic>[
        <String, dynamic>{'registrationNumber': 12, 'status': 'confirmed1'},
        <String, dynamic>{'registrationNumber': 3, 'status': 'in_progress'},
        <String, dynamic>{'status': 'in_progress'},
        'sai',
      ]);
      expect(
          list.map((JudgeContestant c) => c.registrationNumber), <int>[3, 12]);
      expect(list.first.status, JudgeContestantStatus.inProgress);
      expect(list.last.status, JudgeContestantStatus.confirmed1);
    });
  });
}
