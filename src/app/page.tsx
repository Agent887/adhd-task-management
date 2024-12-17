export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Done365</h1>
      <p className="text-lg mb-4">
        A modern task management application designed specifically for individuals with ADHD.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="ADHD-Optimized"
          description="Task management designed around ADHD brain patterns and needs"
          icon="🧠"
        />
        <FeatureCard
          title="Smart Scheduling"
          description="AI-powered task scheduling based on your energy levels"
          icon="⚡"
        />
        <FeatureCard
          title="Context Management"
          description="Minimize context switching and cognitive load"
          icon="🎯"
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
