export default function QuizPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Skill Quiz</h1>
      <p className="text-gray-500 mb-8">We'll assess your skills based on your career goal.</p>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 max-w-lg">
        <p className="text-gray-700 mb-6">Ready to take your personalized skill assessment?</p>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Start Quiz
        </button>
      </div>
    </div>
  );
}
