# PLAN: Chức năng Thí sinh Trả lời Realtime (Chỉ Đúng/Sai)

## 📋 Tổng quan
Bổ sung chức năng cho phép thí sinh trả lời câu hỏi trực tiếp qua hệ thống realtime, chỉ xác định đúng/sai mà không tính điểm số. Hệ thống sẽ tự động phản hồi kết quả ngay lập tức cho thí sinh và có thể tự động loại thí sinh dựa trên câu trả lời sai.

## ✅ Phân tích hiện trạng dự án

### Đã có sẵn:
- [x] **Socket.IO Integration**: Hệ thống socket đã được setup với namespace `/match-control`
- [x] **JWT Authentication**: Xác thực cho socket connections
- [x] **Database Models**: 
  - `Result` model để lưu kết quả trả lời với trường `isCorrect: boolean`
  - `Contestant` model với status management
  - `Match` model với thông tin trận đấu
  - `Question` và `QuestionDetail` models
- [x] **Result Service**: CRUD operations cho kết quả trả lời
- [x] **Match Control System**: Events cho hiển thị câu hỏi (`currentQuestion:get`)
- [x] **Room Management**: Hệ thống room theo `match-{matchId}`
- [x] **Validation Layer**: Zod schemas cho data validation
- [x] **Logging System**: Winston logger cho audit trail
- [x] **Role-based Access**: Admin, Judge, Student roles

### Đã hoàn thành (Phase 1-2):
- [x] **Student Socket Authentication**: ✅ Thí sinh đã có quyền connect socket
- [x] **Answer Submission Events**: ✅ Events cho việc nộp bài realtime đã được tạo
- [x] **Answer Validation System**: ✅ Kiểm tra đáp án đúng/sai realtime cơ bản
- [x] **Answer History Tracking**: ✅ Lưu vết lịch sử trả lời trong Result table
- [x] **Realtime Match Control**: ✅ Bắt đầu trận đấu, chuyển câu hỏi realtime
- [x] **Timer System**: ✅ Countdown timer cho từng câu hỏi với pause/resume
- [x] **Match Status Management**: ✅ Theo dõi trạng thái trận đấu realtime
- [x] **Auto Timer Updates**: ✅ Cập nhật thời gian còn lại mỗi giây
- [x] **Frontend Components**: ✅ UI components cho student và admin
- [x] **Question Display**: ✅ Hiển thị câu hỏi với HTML content
- [x] **Pending Result Logic**: ✅ Ẩn kết quả đến khi thời gian < 1 giây

### Còn thiếu (Phase 3 - NEW REQUIREMENTS):
- [ ] **🔥 Auto Elimination Logic**: Logic tự động loại thí sinh khi trả lời sai
- [ ] **🔥 Selective Question Delivery**: Chỉ gửi câu hỏi đến thí sinh chưa bị loại
- [ ] **🔥 ContestantMatch Status Management**: Cập nhật status = eliminated
- [ ] **🔥 Match Completion Logic**: Cập nhật match status = finished
- [ ] **🔥 Eliminated Student Block**: Chặn thí sinh đã loại không trả lời tiếp
- [ ] **Enhanced UI/UX**: Cải thiện giao diện phản hồi cho elimination
- [ ] **Performance Optimization**: Tối ưu hóa cho nhiều người dùng

## 🎯 Yêu cầu chức năng (CẬP NHẬT)

### 1. Student Authentication for Socket ✅ HOÀN THÀNH
- [x] Thí sinh có thể connect vào socket với JWT token
- [x] Validate contestant tồn tại và đang tham gia match
- [x] Join room theo matchId của contestant

### 2. Realtime Answer Submission ✅ HOÀN THÀNH
- [x] Event `submitAnswer` từ student client
- [x] Validate câu trả lời (format, timing)
- [x] Lưu kết quả vào database với `isCorrect: boolean`
- [x] Broadcast kết quả đến các client khác

### 3. Instant Answer Validation & Feedback ✅ HOÀN THÀNH
- [x] Kiểm tra đáp án với question details ngay lập tức
- [x] Realtime feedback cho thí sinh (ĐÚNG/SAI)
- [x] Log chi tiết quá trình trả lời
- [x] Không tính điểm số - chỉ đúng/sai
- [x] Ẩn kết quả đến khi thời gian < 1 giây

### 4. Realtime Match Control ✅ HOÀN THÀNH
- [x] Bắt đầu trận đấu (`match:start`)
- [x] Chuyển câu hỏi realtime (`match:nextQuestion`)
- [x] Timer countdown tự động (`match:timerUpdated`)
- [x] Pause/Resume timer (`match:pauseTimer`, `match:resumeTimer`)
- [x] Kết thúc trận đấu (`match:end`)
- [x] Lấy trạng thái trận đấu (`match:getStatus`)

### 5. 🔥 NEW: Auto Elimination System ❌ CẦN TRIỂN KHAI
- [ ] **Logic tự động loại thí sinh khi trả lời sai**
  - [ ] Cập nhật `contestantMatch.status = "Eliminated"` ngay khi trả lời sai
  - [ ] Ghi log elimination với chi tiết (câu hỏi, đáp án sai, thời gian)
  - [ ] Broadcast event `contestant:eliminated` đến tất cả clients
  - [ ] Block thí sinh đã loại không thể trả lời các câu tiếp theo

### 6. 🔥 NEW: Selective Question Delivery ❌ CẦN TRIỂN KHAI
- [ ] **Chỉ gửi câu hỏi đến thí sinh còn tham gia**
  - [ ] Filter contestants có `status = "in_progress"` hoặc `status = "Rescued"` hoặc status ="not_started"
  - [ ] Exclude contestants có `status = "Eliminated"`
  - [ ] Update event `match:questionChanged` chỉ broadcast đến eligible students
  - [ ] Admin vẫn thấy tất cả, students bị loại nhận notification nhưng không thấy câu hỏi

### 7. 🔥 NEW: Match Completion Logic ❌ CẦN TRIỂN KHAI
- [ ] **Tự động kết thúc trận đấu**
  - [ ] Khi hết câu hỏi: `match.status = "Finished"`
  - [ ] Khi admin click end: `match.status = "Finished"`
  - [ ] Khi chỉ còn 1 thí sinh: tùy chọn auto-finish
  - [ ] Generate final summary với elimination statistics

### 8. 🔥 NEW: Eliminated Student Experience ❌ CẦN TRIỂN KHAI
- [ ] **Trải nghiệm cho thí sinh đã bị loại**
  - [ ] Hiển thị màn hình "Đã bị loại" với thông tin chi tiết
  - [ ] Vẫn có thể xem câu hỏi nhưng không thể trả lời
  - [ ] Theo dõi progress của các thí sinh còn lại
  - [ ] Notification khi có thí sinh khác bị loại

## 🏗️ Thiết kế Architecture (CẬP NHẬT)

### Database Changes Needed:
```sql
-- ✅ SỬ DỤNG CÁC TRƯỜNG HIỆN CÓ:
-- ContestantMatch.status: enum ContestantMatchStatus
--   InProgress -> đang thi, có thể trả lời
--   Eliminated -> đã bị loại, không thể trả lời  
--   Rescued -> đã được cứu, có thể trả lời tiếp
--   Completed -> hoàn thành (hết câu hỏi)

-- Match.status: enum MatchStatus  
--   active -> đang diễn ra
--   finished -> đã kết thúc (NEW TARGET STATUS)

-- Result.isCorrect: boolean ✅ ĐÃ SỬ DỤNG
-- Match.currentQuestion: int ✅ ĐÃ SỬ DỤNG
-- Match.remainingTime: int ✅ ĐÃ SỬ DỤNG

-- 🔥 NEW: CẦN THÊM BẢNG GHI LOG ELIMINATION
CREATE TABLE EliminationLogs (
  id: int AUTO_INCREMENT PRIMARY KEY,
  contestantId: int NOT NULL,
  matchId: int NOT NULL, 
  questionOrder: int NOT NULL,
  eliminatedAt: datetime NOT NULL,
  submittedAnswer: text,
  correctAnswer: text,
  eliminationReason: varchar(255),
  FOREIGN KEY (contestantId) REFERENCES contestants(id),
  FOREIGN KEY (matchId) REFERENCES matches(id),
  INDEX idx_match_elimination (matchId, eliminatedAt)
);
```

### Core Socket Events (CẬP NHẬT):
```typescript
// Client -> Server ✅ ĐÃ IMPLEMENT
'student:joinMatch' - Thí sinh join vào match ✅
'student:submitAnswer' - Nộp câu trả lời ✅
'student:getMatchStatus' - Lấy trạng thái match ✅
'student:getQuestion' - Lấy chi tiết câu hỏi ✅

// Admin/Judge -> Server ✅ ĐÃ IMPLEMENT
'match:start' - Bắt đầu trận đấu ✅
'match:nextQuestion' - Chuyển câu hỏi tiếp theo ✅
'match:pauseTimer' - Tạm dừng timer ✅
'match:resumeTimer' - Tiếp tục timer ✅
'match:end' - Kết thúc trận đấu ✅
'match:getStatus' - Lấy trạng thái trận đấu ✅

// Server -> Client ✅ ĐÃ IMPLEMENT
'student:joinedMatch' - Thông báo thí sinh đã join ✅
'match:answerSubmitted' - Kết quả trả lời (ĐÚNG/SAI) ✅
'match:started' - Trận đấu bắt đầu ✅
'match:questionChanged' - Câu hỏi được thay đổi ✅
'match:timerUpdated' - Cập nhật thời gian còn lại ✅
'match:timerWarning' - Cảnh báo thời gian sắp hết ✅
'match:timeUp' - Hết thời gian ✅
'match:timerPaused' - Timer bị tạm dừng ✅
'match:timerResumed' - Timer được tiếp tục ✅
'match:ended' - Trận đấu kết thúc ✅

// 🔥 NEW EVENTS CẦN TRIỂN KHAI:
'contestant:eliminated' - Thí sinh bị loại ❌
'match:eliminationUpdate' - Cập nhật danh sách elimination ❌
'match:finished' - Trận đấu hoàn thành ❌
'match:eligibilityChanged' - Thay đổi quyền trả lời ❌
```

### Core Service Methods (CẬP NHẬT):
```typescript
// AnswerService (trong student.events.ts) ✅ ĐÃ CÓ
- validateAnswer(questionId, answer, type) ✅ ĐÃ CÓ TRONG EVENT
- processStudentAnswer(contestantId, matchId, questionOrder, answer) ✅ ĐÃ CÓ
- getAnswerResult(resultId) -> {isCorrect: boolean, answer: string} ✅

// TimerService ✅ ĐÃ CÓ
- startTimer(matchId, initialTime) ✅ ĐÃ CÓ
- stopTimer(matchId) ✅ ĐÃ CÓ
- pauseTimer(matchId) ✅ ĐÃ CÓ
- resumeTimer(matchId) ✅ ĐÃ CÓ
- getTimerStatus(matchId) ✅ ĐÃ CÓ

// MatchControlService (trong match.events.ts) ✅ ĐÃ CÓ
- startMatch(matchId) ✅ ĐÃ CÓ
- nextQuestion(matchId, questionOrder) ✅ ĐÃ CÓ
- endMatch(matchId) ✅ ĐÃ CÓ
- getMatchStatus(matchId) ✅ ĐÃ CÓ

// 🔥 NEW SERVICES CẦN TRIỂN KHAI:
- eliminateContestant(contestantId, matchId, eliminationData) ❌
- getEligibleContestants(matchId) -> ContestantMatch[] ❌
- updateContestantMatchStatus(contestantId, matchId, status) ❌
- logEliminationEvent(contestantId, matchId, details) ❌
- finishMatch(matchId, reason) -> MatchSummary ❌
- checkEliminationCriteria(contestantId, matchId) -> boolean ❌
- generateMatchSummary(matchId) -> EliminationStatistics ❌
```

## 📝 Implementation Plan (CẬP NHẬT)

### Phase 1: Core Realtime Answer System ✅ HOÀN THÀNH
- [x] Socket authentication cho students
- [x] Basic answer submission events
- [x] Instant answer validation (đúng/sai)
- [x] Realtime feedback cho thí sinh
- [x] Pending result logic (ẩn kết quả đến < 1s)

### Phase 2: Enhanced Match Control ✅ HOÀN THÀNH
- [x] Realtime match start/end controls
- [x] Question navigation controls
- [x] Timer system với countdown
- [x] Pause/Resume timer functionality
- [x] Match status tracking
- [x] Frontend components integration

### Phase 3: 🔥 Auto Elimination & Match Completion ❌ ĐANG TRIỂN KHAI
- [ ] **3A: Auto Elimination Logic**
  - [ ] Implement `eliminateContestant()` service method
  - [ ] Auto-update `contestantMatch.status = "Eliminated"` on wrong answer
  - [ ] Create `EliminationLogs` table và logging service
  - [ ] Block eliminated students from further submissions
  - [ ] Broadcast elimination events to all clients

- [ ] **3B: Selective Question Delivery**
  - [ ] Filter recipients for `match:questionChanged` events
  - [ ] Only send to contestants with status `InProgress` or `Rescued`
  - [ ] Implement `getEligibleContestants(matchId)` service
  - [ ] Update question broadcast logic

- [ ] **3C: Match Completion System**
  - [ ] Auto-finish match when no more questions
  - [ ] Update `match.status = "Finished"` 
  - [ ] Generate final elimination statistics
  - [ ] Implement `finishMatch()` service method

- [ ] **3D: Eliminated Student Experience**
  - [ ] Design elimination screen UI
  - [ ] Read-only mode for eliminated students
  - [ ] Live elimination feed for all participants
  - [ ] Final match summary display

### Phase 4: Production Ready ❌ CHƯA TRIỂN KHAI
- [ ] Load testing với elimination scenarios
- [ ] Performance optimization với multiple eliminations
- [ ] Security hardening cho elimination logic
- [ ] Monitoring và analytics cho elimination rates
- [ ] Documentation và deployment

## 🔧 Technical Implementation Details (NEW)

## File Structure (CẬP NHẬT):
```
src/socket/
├── index.ts                          ✅ Updated - Socket initialization
├── SocketService.ts                  ✅ Existing - Singleton service
├── services/
│   ├── timer.service.ts              ✅ NEW - Timer management
│   ├── elimination.service.ts        ❌ NEW - Elimination logic 🔥
│   └── match.service.ts              ❌ NEW - Match completion logic 🔥
├── events/
│   ├── student.events.ts             ✅ UPDATE - Add elimination logic 🔥
│   ├── match.events.ts               ✅ UPDATE - Add selective delivery 🔥
│   ├── question.events.ts            ✅ Existing - Question display
│   ├── screen.events.ts              ✅ Existing - Screen control
│   └── test.events.ts                ✅ Existing - Test events
└── namespaces/
    └── matchControl.namespace.ts     ✅ Existing - Match namespace

src/database/
├── migrations/
│   └── add_elimination_logs.sql      ❌ NEW - Elimination tracking 🔥
└── schema.prisma                     ❌ UPDATE - Add EliminationLogs model 🔥

frontend/
├── QuestionAnswer.tsx                ✅ UPDATE - Add elimination UI 🔥
├── EliminationScreen.tsx             ❌ NEW - Elimination display 🔥
├── MatchSummary.tsx                  ❌ NEW - Final summary 🔥
└── AdminDashboard.tsx                ✅ UPDATE - Add elimination tracking 🔥
```

### ✅ **VALIDATION CHECKLIST:**
- [ ] Thí sinh trả lời sai → tự động `status = "Eliminated"`
- [ ] Thí sinh đã loại không thể submit answer
- [ ] Chỉ thí sinh `InProgress/Rescued` nhận câu hỏi mới
- [ ] Hết câu hỏi → `match.status = "Finished"`
- [ ] UI hiển thị elimination screen
- [ ] Admin tracking elimination statistics

---

## 🎬 **PHASE 4: MEDIA DISPLAY REQUIREMENTS**

### 📋 **TÓM TẮT YÊU Cầu MEDIA:**
1. **Question Media Display**: Hiển thị `questionMedia` (image/video/audio) trong câu hỏi
2. **Answer Media Display**: Hiển thị `mediaAnswer` (image/video/audio) sau khi trả lời
3. **Responsive Media Grid**: Layout responsive cho multiple media files
4. **Media Performance**: Lazy loading, preload optimization
5. **Media Error Handling**: Fallback UI khi media không load được

### 🎯 **PHÂN TÍCH VẤN ĐỀ HIỆN TẠI:**

#### ❌ **VẤN ĐỀ 1: QuestionAnswer Component thiếu Media Display**
- **Hiện trạng**: Component `QuestionAnswer.tsx` chỉ hiển thị text content và options
- **Thiếu**: Hoàn toàn không có logic hiển thị `questionMedia` và `mediaAnswer`
- **Impact**: Thí sinh không thể thấy media đi kèm câu hỏi và đáp án
- **Tần suất**: 100% câu hỏi có media sẽ bị ảnh hưởng

#### ❌ **VẤN ĐỀ 2: Cấu trúc Database Media không đồng bộ**
- **Hiện trạng**: Backend có cấu trúc `MediaFile[]` hoàn chỉnh
- **Thiếu**: Frontend `CurrentQuestionData` interface không define media fields
- **Impact**: TypeScript errors và data không được truyền đúng
- **Risk**: Runtime errors khi access media properties

#### ❌ **VẤN ĐỀ 3: Socket Events thiếu Media Data**
- **Hiện trạng**: `match:questionChanged` chỉ truyền basic question info
- **Thiếu**: `questionMedia` và `mediaAnswer` không được include trong events
- **Impact**: Frontend không nhận được media data qua realtime
- **Performance**: Phải call thêm API để fetch media

#### ❌ **VẤN ĐỀ 4: Media Performance trong Realtime Match**
- **Hiện trạng**: Không có lazy loading cho media files
- **Thiếu**: Media preloading strategy cho realtime environment
- **Impact**: Slow loading, poor UX khi chuyển câu hỏi nhanh
- **Bandwidth**: Waste bandwidth cho eliminated students

### 🛠️ **GIẢI PHÁP CHI TIẾT:**

#### **Giải pháp 1: Bổ sung Media Display vào QuestionAnswer Component** ❌ CẦN TRIỂN KHAI

**📂 File cần sửa:** `Contests-FE/src/features/student/components/QuestionAnswer.tsx`

**🔧 Changes Required:**
```typescript
// 1. Update interface để include media
interface QuestionData {
  id: number;
  content: string;
  intro?: string;
  questionType: string;
  difficulty: string;
  score: number;
  defaultTime: number;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  questionMedia?: MediaFile[] | null; // 🔥 NEW
  mediaAnswer?: MediaFile[] | null;   // 🔥 NEW
}

interface MediaFile {
  type: "image" | "video" | "audio";
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

// 2. Thêm Media Display Component
const MediaGallery = ({ media, title }: { media: MediaFile[] | null, title: string }) => {
  if (!media || media.length === 0) return null;
  
  return (
    <Box className="mb-4">
      <Typography variant="subtitle1" className="font-semibold mb-2 text-gray-700">
        {title}
      </Typography>
      <Box className={`grid gap-3 ${getGridLayout(media.length)}`}>
        {media.map((item, index) => (
          <MediaItem key={index} media={item} index={index} />
        ))}
      </Box>
    </Box>
  );
};

const MediaItem = ({ media, index }: { media: MediaFile, index: number }) => {
  const [loadError, setLoadError] = useState(false);
  
  if (loadError) {
    return (
      <Box className="bg-gray-100 p-4 rounded-lg text-center">
        <Typography variant="body2" className="text-gray-500">
          Media không thể tải: {media.filename}
        </Typography>
      </Box>
    );
  }
  
  switch (media.type) {
    case 'image':
      return (
        <Box 
          component="img"
          src={media.url}
          alt={`Media ${index + 1}`}
          className="w-full h-48 object-contain rounded-lg shadow-md"
          loading="lazy"
          onError={() => setLoadError(true)}
        />
      );
      
    case 'video':
      return (
        <Box 
          component="video"
          src={media.url}
          controls
          preload="metadata"
          className="w-full h-48 rounded-lg shadow-md"
          onError={() => setLoadError(true)}
        >
          Trình duyệt không hỗ trợ video
        </Box>
      );
      
    case 'audio':
      return (
        <Box className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg shadow-md">
          <Box className="flex items-center justify-center mb-2">
            <Audiotrack className="text-indigo-500" />
          </Box>
          <Box 
            component="audio"
            src={media.url}
            controls
            className="w-full"
            preload="metadata"
            onError={() => setLoadError(true)}
          >
            Trình duyệt không hỗ trợ audio
          </Box>
          <Typography variant="caption" className="text-center block mt-1">
            {media.filename}
          </Typography>
        </Box>
      );
      
    default:
      return null;
  }
};

// 3. Thêm vào render JSX của QuestionAnswer
return (
  <Box className="space-y-4 relative">
    {/* ... existing timer và header code ... */}
    
    {/* Nội dung câu hỏi */}
    <Card>
      <CardContent>
        {/* ... existing intro và content ... */}
        
        {/* 🔥 NEW: Question Media Display */}
        <MediaGallery 
          media={currentQuestion.question.questionMedia} 
          title="📎 Media đính kèm:"
        />
        
        <Divider className="mb-4" />
        
        {/* ... existing options ... */}
        
        {/* ... existing submit button ... */}
        
        {/* 🔥 NEW: Answer Media Display (chỉ hiện sau khi submit) */}
        {isSubmitted && answerResult && (
          <>
            {/* ... existing result display ... */}
            
            <MediaGallery 
              media={currentQuestion.question.mediaAnswer} 
              title="🎯 Media giải thích:"
            />
          </>
        )}
      </CardContent>
    </Card>
  </Box>
);
```

#### **Giải pháp 2: Update Socket Events để truyền Media Data** ❌ CẦN TRIỂN KHAI

**📂 File cần sửa:** `Contests-BE/src/socket/events/match.events.ts`

**🔧 Changes Required:**
```typescript
// File: src/socket/events/match.events.ts (UPDATE)
async function handleNextQuestion(socket, data, callback) {
  try {
    // ... existing code ...
    
    // 🔥 GET FULL QUESTION WITH MEDIA
    const fullQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        content: true,
        intro: true,
        questionType: true,
        difficulty: true,
        score: true,
        defaultTime: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        questionMedia: true,    // 🔥 INCLUDE MEDIA
        mediaAnswer: true       // 🔥 INCLUDE MEDIA
      }
    });
    
    // Broadcast with full media data
    const questionData = {
      ...fullQuestion,
      questionMedia: fullQuestion.questionMedia || [],
      mediaAnswer: fullQuestion.mediaAnswer || []
    };
    
    // Send to eligible contestants với full data
    eligibleSockets.forEach(socketId => {
      io.to(socketId).emit("match:questionAvailable", {
        matchId: data.matchId,
        questionOrder: newQuestionOrder,
        remainingTime: defaultTime,
        question: questionData, // 🔥 FULL DATA WITH MEDIA
        canAnswer: true
      });
    });
    
  } catch (error) {
    logger.error("Error in handleNextQuestion:", error);
    callback({ success: false, message: "Không thể chuyển câu hỏi" });
  }
}
```

#### **Giải pháp 3: Media Performance Optimization** ❌ CẦN TRIỂN KHAI

**🔧 Optimization Strategies:**
```typescript
// 1. Media Preloading Service
class MediaPreloadService {
  private preloadCache = new Map<string, HTMLImageElement | HTMLVideoElement | HTMLAudioElement>();
  
  preloadQuestion(questionData: QuestionData) {
    // Preload questionMedia
    if (questionData.questionMedia) {
      questionData.questionMedia.forEach(media => {
        this.preloadMedia(media);
      });
    }
    
    // Don't preload mediaAnswer (only after submission)
  }
  
  preloadMedia(media: MediaFile) {
    if (this.preloadCache.has(media.url)) return;
    
    let element: HTMLImageElement | HTMLVideoElement | HTMLAudioElement;
    
    switch (media.type) {
      case 'image':
        element = new Image();
        element.src = media.url;
        break;
        
      case 'video':
        element = document.createElement('video');
        element.src = media.url;
        element.preload = 'metadata';
        break;
        
      case 'audio':
        element = document.createElement('audio');
        element.src = media.url;
        element.preload = 'metadata';
        break;
    }
    
    this.preloadCache.set(media.url, element);
  }
}

// 2. Lazy Loading Implementation
const LazyMediaItem = ({ media, index }: { media: MediaFile, index: number }) => {
  const [isInView, setIsInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <Box ref={elementRef} className="w-full h-48">
      {isInView ? (
        <MediaItem media={media} index={index} />
      ) : (
        <Box className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

// 3. Media Error Fallback
const MediaErrorBoundary = ({ children, media }: { children: React.ReactNode, media: MediaFile }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <Alert severity="warning" className="mb-2">
        <Typography variant="body2">
          Không thể tải media: {media.filename}
        </Typography>
        <Button 
          size="small" 
          onClick={() => setHasError(false)}
          className="mt-1"
        >
          Thử lại
        </Button>
      </Alert>
    );
  }
  
  return (
    <ErrorBoundary onError={() => setHasError(true)}>
      {children}
    </ErrorBoundary>
  );
};
```

#### **Giải pháp 4: Responsive Media Grid Layout** ❌ CẦN TRIỂN KHAI

**🔧 CSS Grid Implementation:**
```typescript
// Responsive grid helper
const getGridLayout = (mediaCount: number): string => {
  switch (mediaCount) {
    case 1:
      return "grid-cols-1"; // Single full-width
    case 2:
      return "grid-cols-1 sm:grid-cols-2"; // Stack on mobile, side-by-side on tablet+
    case 3:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"; // 1->2->3 columns
    case 4:
      return "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"; // 2->2->4 columns
    default:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"; // Max 3 columns
  }
};

// Media height responsive
const getMediaHeight = (mediaCount: number): string => {
  if (mediaCount === 1) return "h-64 sm:h-80"; // Larger for single media
  if (mediaCount === 2) return "h-48 sm:h-56"; // Medium for pair
  return "h-40 sm:h-48"; // Smaller for multiple
};

// Aspect ratio preservation
const MediaContainer = ({ children, media }: { children: React.ReactNode, media: MediaFile }) => {
  const aspectRatio = media.dimensions 
    ? media.dimensions.width / media.dimensions.height 
    : 16/9; // Default aspect ratio
    
  return (
    <Box 
      className="relative overflow-hidden rounded-lg shadow-md"
      style={{ 
        aspectRatio: aspectRatio,
        maxHeight: '300px'
      }}
    >
      {children}
    </Box>
  );
};
```

### 📊 **IMPLEMENTATION PRIORITY (PHASE 4):**

#### **🔥 HIGH PRIORITY:**
1. **QuestionAnswer Media Display** - Blocking cho basic functionality
2. **Socket Events Media Data** - Required cho realtime media
3. **Media Error Handling** - Critical cho production stability

#### **⚡ MEDIUM PRIORITY:**
4. **Responsive Grid Layout** - Important cho UX
5. **Basic Lazy Loading** - Performance improvement

#### **💡 LOW PRIORITY:**
6. **Advanced Preloading** - Optimization feature
7. **Media Compression** - Advanced performance
8. **Offline Media Cache** - Advanced feature

### 📝 **FILES TO CREATE/MODIFY (PHASE 4):**

```
Frontend (CẦN SỬA/TẠO):
✅ QuestionAnswer.tsx (MAJOR UPDATE - add media display)
❌ MediaGallery.tsx (NEW component)
❌ LazyMediaItem.tsx (NEW component)  
❌ MediaErrorBoundary.tsx (NEW component)
❌ MediaPreloadService.ts (NEW service)
❌ mediaUtils.ts (NEW utilities)

Backend (CẦN SỬA):
✅ match.events.ts (UPDATE - include media in socket events)
✅ student.events.ts (UPDATE - include media in question data)

Types (CẦN SỬA):
✅ QuestionAnswer props interface (UPDATE)
✅ CurrentQuestionData interface (UPDATE)
```

### 🧪 **TESTING CHECKLIST (PHASE 4):**

#### **Functional Tests:**
- [ ] Question với image media hiển thị chính xác
- [ ] Question với video media có controls và play được
- [ ] Question với audio media có controls và play được
- [ ] Question với multiple media hiển thị grid layout
- [ ] MediaAnswer chỉ hiện sau khi submit answer
- [ ] Media error handling hoạt động khi file không tồn tại
- [ ] Responsive layout trên mobile/tablet/desktop

#### **Performance Tests:**
- [ ] Media loading không block UI rendering
- [ ] Large media files không crash browser
- [ ] Multiple media files load concurrently
- [ ] Lazy loading giảm initial page load time
- [ ] Memory usage ổn định khi switch questions

#### **Edge Cases:**
- [ ] Question không có media - không hiển thị section
- [ ] Media file bị corrupt - show fallback UI
- [ ] Network slow - show loading state
- [ ] Mix media types (image+video+audio) - grid layout đúng
- [ ] Media file quá lớn - show file size warning

### 🎯 **SUCCESS METRICS (PHASE 4):**

#### **User Experience:**
- **Media Load Time**: < 2s cho files < 10MB
- **Error Rate**: < 1% media loading failures  
- **Mobile Responsiveness**: 100% layout consistency
- **Accessibility**: Screen reader compatible

#### **Performance:**
- **Page Load Impact**: < 500ms delay với media
- **Memory Usage**: < 100MB increase với 5+ media files
- **Bandwidth Efficiency**: 30% reduction với lazy loading
- **Cache Hit Rate**: > 80% cho repeated media

---
*PLAN UPDATED với MEDIA DISPLAY REQUIREMENTS*
*Phase 4 Ready for Implementation* 🎬

---
*PLAN UPDATED với AUTO ELIMINATION REQUIREMENTS*
*Ready for Phase 3 Implementation* 🔥

## ⚡ **PHASE 5: AUTO-ADVANCE QUESTION LOGIC**

### 📋 **TÓM TẮT YÊU CẦU AUTO-ADVANCE:**
1. **Manual Control by Default**: Mặc định câu hỏi KHÔNG tự động chuyển
2. **Auto-Advance Toggle**: Nút bật/tắt auto-advance trong admin panel
3. **Smart Auto-Advance**: Tự động chuyển câu khi hết thời gian hoặc tất cả đã trả lời
4. **Flexible Control**: Admin có thể bật/tắt mid-match
5. **Clear Indicators**: UI rõ ràng về trạng thái auto-advance

### 🎯 **PHÂN TÍCH VẤN ĐỀ HIỆN TẠI:**

#### ❌ **VẤN ĐỀ 1: Không có Control cho Auto-Advance**
- **Hiện trạng**: Admin phải manually click next question mỗi lần
- **Thiếu**: Toggle button để enable/disable auto-advance
- **Impact**: Workflow không smooth cho giáo viên khi có nhiều câu hỏi
- **Use Case**: Giáo viên muốn focus vào giảng bài thay vì click next

#### ❌ **VẤN ĐỀ 2: Không có Smart Auto-Advance Logic**
- **Hiện trạng**: Không có logic tự động chuyển câu dựa trên conditions
- **Thiếu**: Auto-advance khi hết thời gian hoặc tất cả đã submit
- **Impact**: Waste time chờ đợi khi không cần thiết
- **Efficiency**: Không tối ưu hóa pace của trận đấu

#### ❌ **VẤN ĐỀ 3: Match State không track Auto-Advance**
- **Hiện trạng**: Database không lưu trạng thái auto-advance
- **Thiếu**: Match model không có `autoAdvanceEnabled` field
- **Impact**: Không thể restore trạng thái khi reconnect
- **Consistency**: Settings bị mất khi page refresh

#### ❌ **VẤN ĐỀ 4: UI không có Auto-Advance Indicators**
- **Hiện trạng**: Admin không biết auto-advance đang bật/tắt
- **Thiếu**: Clear visual indicators và controls
- **Impact**: Confusion về trạng thái current mode
- **UX**: Poor admin experience
