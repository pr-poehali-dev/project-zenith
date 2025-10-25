import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { GameCanvas } from '@/components/GameCanvas';
import { createPlayer, generateObstacles, GameState } from '@/lib/gameEngine';
import { useTranslation, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';

interface Level {
  id: number;
  level_number: number;
  name: string;
  difficulty: number;
  music_url: string;
  duration: number;
}

interface User {
  id: number;
  username: string;
  total_stars: number;
}

const Index = () => {
  const [language, setLanguage] = useState<Language>('ru');
  const t = useTranslation(language);
  const { toast } = useToast();
  
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [levels, setLevels] = useState<Level[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [autoRestart, setAutoRestart] = useState(true);

  useEffect(() => {
    fetch('/api/levels').then(r => r.json()).then(setLevels).catch(() => {
      setLevels([
        { id: 1, level_number: 1, name: 'Neon Start', difficulty: 1, music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 25 },
        { id: 2, level_number: 2, name: 'Electric Flow', difficulty: 2, music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 30 },
        { id: 3, level_number: 3, name: 'Cyber Jump', difficulty: 3, music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 35 },
        { id: 4, level_number: 4, name: 'Digital Chaos', difficulty: 4, music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 40 },
        { id: 5, level_number: 5, name: 'Quantum Dash', difficulty: 5, music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 45 },
      ]);
    });

    fetch('/api/leaderboard').then(r => r.json()).then(setLeaderboard).catch(() => setLeaderboard([]));
  }, []);

  const startLevel = (level: Level) => {
    setCurrentLevel(level);
    const obstacles = generateObstacles(level.difficulty, level.duration);
    setGameState({
      player: createPlayer(),
      obstacles,
      scrollOffset: 0,
      isGameOver: false,
      isCompleted: false,
      startTime: Date.now(),
      elapsedTime: 0,
    });
    setCurrentView('game');

    if (level.music_url) {
      const audio = new Audio(level.music_url);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(() => {});
      setAudioElement(audio);
    }
  };

  const handleGameOver = () => {
    if (autoRestart && currentLevel) {
      setTimeout(() => {
        startLevel(currentLevel);
      }, 500);
    } else {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      toast({
        title: t('gameOver'),
        description: t('retry'),
        variant: 'destructive',
      });
    }
  };

  const handleLevelComplete = async () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    
    if (gameState && currentLevel && user) {
      const timeInSeconds = Math.floor(gameState.elapsedTime / 1000);
      
      try {
        const response = await fetch('https://functions.poehali.dev/ea2a257c-745d-4a51-957a-80f753406af9', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: user.id,
            level_id: currentLevel.id,
            completed: true,
            time_seconds: timeInSeconds,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.total_stars !== undefined) {
            setUser({ ...user, total_stars: data.total_stars });
          }
        }
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
      
      toast({
        title: t('levelComplete'),
        description: `${t('bestTime')}: ${timeInSeconds} ${t('sec')}`,
      });
    }
  };

  const handleAuth = async () => {
    const action = isLogin ? 'login' : 'register';
    try {
      const response = await fetch('https://functions.poehali.dev/806aaad4-ec56-4897-998f-2a493537c9d5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, action }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setShowAuth(false);
        toast({ title: isLogin ? t('login') : t('register'), description: `${t('username')}: ${data.user.username}` });
        
        fetch('https://functions.poehali.dev/aef3ba3d-d8dd-46e3-825e-af8b0a1ad04a')
          .then(r => r.json())
          .then(data => setLeaderboard(data.leaderboard || []))
          .catch(() => {});
      } else {
        toast({ title: 'Error', variant: 'destructive' });
      }
    } catch {
      setUser({ id: 1, username, total_stars: 0 });
      setShowAuth(false);
    }
  };

  const backToMenu = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setCurrentView('menu');
    setGameState(null);
    setCurrentLevel(null);
  };

  const renderStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <Icon key={i} name="Star" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
    ));
  };

  if (currentView === 'game' && gameState && currentLevel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-2xl font-bold neon-glow" style={{ color: 'hsl(var(--neon-blue))' }}>
            {currentLevel.name}
          </h2>
          <div className="flex gap-1">{renderStars(currentLevel.difficulty)}</div>
        </div>
        
        <GameCanvas
          gameState={gameState}
          onUpdate={setGameState}
          onComplete={handleLevelComplete}
          onGameOver={handleGameOver}
          orientation={orientation}
        />
        
        <div className="mt-4 flex gap-2 flex-wrap justify-center">
          <Button onClick={backToMenu} variant="outline">
            <Icon name="ArrowLeft" className="mr-2 w-4 h-4" />
            {t('backToMenu')}
          </Button>
          <Button onClick={() => currentLevel && startLevel(currentLevel)}>
            <Icon name="RotateCcw" className="mr-2 w-4 h-4" />
            {t('retry')}
          </Button>
          <Button 
            onClick={() => setAutoRestart(!autoRestart)} 
            variant={autoRestart ? 'default' : 'outline'}
          >
            <Icon name="Repeat" className="mr-2 w-4 h-4" />
            Авто
          </Button>
          <Button 
            onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
            variant="outline"
          >
            <Icon name={orientation === 'horizontal' ? 'Smartphone' : 'Monitor'} className="mr-2 w-4 h-4" />
            {orientation === 'horizontal' ? 'Верт.' : 'Гориз.'}
          </Button>
        </div>
        
        <p className="mt-4 text-muted-foreground">{t('tapToJump')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-background to-background/80">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-6xl font-bold neon-glow mb-2" style={{ color: 'hsl(var(--neon-blue))' }}>
            {t('title')}
          </h1>
          <div className="flex items-center justify-center gap-4 mt-4">
            {user ? (
              <div className="flex items-center gap-2">
                <Icon name="User" className="w-5 h-5" />
                <span className="font-medium">{user.username}</span>
                <Badge variant="secondary">
                  <Icon name="Star" className="w-3 h-3 mr-1" />
                  {user.total_stars}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => setUser(null)}>
                  {t('logout')}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowAuth(true)}>
                <Icon name="LogIn" className="mr-2 w-4 h-4" />
                {t('login')}
              </Button>
            )}
          </div>
        </header>

        <Tabs defaultValue="levels" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="levels">
              <Icon name="Gamepad2" className="mr-2 w-4 h-4" />
              {t('levels')}
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Icon name="Trophy" className="mr-2 w-4 h-4" />
              {t('leaderboard')}
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Icon name="Award" className="mr-2 w-4 h-4" />
              {t('achievements')}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Icon name="Settings" className="mr-2 w-4 h-4" />
              {t('settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="levels" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levels.map((level) => (
                <Card key={level.id} className="p-6 hover:neon-box transition-all cursor-pointer" onClick={() => startLevel(level)}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{level.name}</h3>
                      <p className="text-sm text-muted-foreground">{t('level')} {level.level_number}</p>
                    </div>
                    <div className="flex gap-1">{renderStars(level.difficulty)}</div>
                  </div>
                  <Button className="w-full" style={{ backgroundColor: 'hsl(var(--neon-blue))' }}>
                    <Icon name="Play" className="mr-2 w-4 h-4" />
                    {t('play')}
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card className="p-6">
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('login')}</p>
                ) : (
                  leaderboard.map((player, idx) => (
                    <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                      <div className="flex items-center gap-3">
                        <Badge variant={idx < 3 ? 'default' : 'secondary'}>#{idx + 1}</Badge>
                        <Icon name="User" className="w-5 h-5" />
                        <span className="font-medium">{player.username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon name="Star" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{player.total_stars}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.length === 0 ? (
                <Card className="p-8 col-span-full">
                  <p className="text-center text-muted-foreground">{t('login')}</p>
                </Card>
              ) : (
                achievements.map((achievement) => (
                  <Card key={achievement.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon name={achievement.icon} className="w-8 h-8 text-primary" />
                      <div>
                        <h4 className="font-bold">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('language')}</label>
                  <div className="flex gap-2">
                    <Button
                      variant={language === 'ru' ? 'default' : 'outline'}
                      onClick={() => setLanguage('ru')}
                    >
                      {t('russian')}
                    </Button>
                    <Button
                      variant={language === 'en' ? 'default' : 'outline'}
                      onClick={() => setLanguage('en')}
                    >
                      {t('english')}
                    </Button>
                    <Button
                      variant={language === 'zh' ? 'default' : 'outline'}
                      onClick={() => setLanguage('zh')}
                    >
                      {t('chinese')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showAuth} onOpenChange={setShowAuth}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isLogin ? t('login') : t('register')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('username')}</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('password')}</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAuth} className="flex-1">
                  {isLogin ? t('login') : t('register')}
                </Button>
                <Button variant="ghost" onClick={() => setIsLogin(!isLogin)} className="flex-1">
                  {isLogin ? t('register') : t('login')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;