import React, { useState, useCallback, useMemo } from 'react';
import type { Rackard, View } from './types';
import { Header } from './components/Header';
import { TennisDeckView } from './components/TennisDeckView';
import { BattleView } from './components/BattleView';
import { CourtCollectView } from './components/CourtCollectView';
import { RunCollectView } from './components/RunCollectView';
import { RadarView } from './components/RadarView';
import { Modal } from './components/Modal';
import { CardDetails } from './components/Card';
import { generateRandomRackard } from './services/geminiService';

const INITIAL_CARDS: Rackard[] = [
  { id: '1', name: 'Grand Slam Smash', description: 'Um smash poderoso que finaliza qualquer ponto.', power: 90, imageUrl: 'https://picsum.photos/seed/gs_smash/300/400' },
  { id: '2', name: 'Defesa de Baseline', description: 'Uma defesa sólida que retorna qualquer bola do fundo da quadra.', power: 85, imageUrl: 'https://picsum.photos/seed/baseline_def/300/400' },
  { id: '3', name: 'Drop Shot Perfeito', description: 'Uma deixadinha sutil que pega o oponente de surpresa.', power: 80, imageUrl: 'https://picsum.photos/seed/drop_shot/300/400' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [tennisDeck, setTennisDeck] = useState<Rackard[]>(INITIAL_CARDS);
  const [selectedCard, setSelectedCard] = useState<Rackard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  
  const apiKey = process.env.API_KEY;

  const addCardToDeck = useCallback((newCard: Rackard) => {
    setTennisDeck(prev => [...prev, newCard]);
    setModalMessage(`Nova Rackard "${newCard.name}" adicionada ao seu deck!`);
  }, []);

  const handleGenerateAndAddCard = useCallback(async (baseCard?: Omit<Rackard, 'id'|'imageUrl'>) => {
      setIsLoading(true);
      try {
        const generated = baseCard || await generateRandomRackard(apiKey);
        const newCard: Rackard = {
          ...generated,
          id: `card-${Date.now()}-${Math.random()}`,
          imageUrl: `https://picsum.photos/seed/${encodeURIComponent(generated.name)}/300/400`,
        };
        return newCard;
      } catch (error) {
        console.error("Failed to generate card", error);
        setModalMessage("Erro ao gerar a carta. Tente novamente.");
        return null;
      } finally {
        setIsLoading(false);
      }
  }, [apiKey]);

  const handleRandomButtonClick = useCallback(async () => {
      const card = await handleGenerateAndAddCard();
      if(card) {
          setSelectedCard(card);
      }
  }, [handleGenerateAndAddCard]);

  const handleCollectCard = useCallback(async (baseCard: Omit<Rackard, 'id'|'imageUrl'>) => {
    const card = await handleGenerateAndAddCard(baseCard);
    if(card) {
      addCardToDeck(card);
    }
  }, [addCardToDeck, handleGenerateAndAddCard]);

  const handleDefeat = useCallback((cardId: string) => {
    setTennisDeck(prev => prev.filter(c => c.id !== cardId));
    setModalMessage("Sua Rackard foi perdida na batalha.");
  }, []);

  const handleVictory = useCallback(async (code: string) => {
    console.log(`Claiming card with code: ${code}`); // Mock logic
    const card = await handleGenerateAndAddCard();
    if(card) {
      addCardToDeck(card);
      setModalMessage(`Você venceu e adquiriu a Rackard "${card.name}" do seu oponente!`);
    }
  }, [addCardToDeck, handleGenerateAndAddCard]);
  

  const renderView = () => {
    switch (currentView) {
      case 'deck':
        return <TennisDeckView deck={tennisDeck} onSelectCard={setSelectedCard} />;
      case 'collect':
        return <CourtCollectView onCollect={handleCollectCard} />;
      case 'run-collect':
        return <RunCollectView onCollect={handleCollectCard} />;
      case 'radar':
        return <RadarView onCollect={handleCollectCard} />;
      case 'battle':
        return <BattleView deck={tennisDeck} onDefeat={handleDefeat} onVictory={handleVictory} />;
      case 'home':
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 flex-grow">
            <h2 className="text-4xl font-bold mb-4 text-tennis-accent">Bem-vindo ao Ás&Ace!</h2>
            <p className="max-w-2xl mb-8 text-lg text-tennis-light/80">
              Colecione cartas poderosas, as Rackards, compita em batalhas emocionantes e domine a quadra de uma maneira totalmente nova. Navegue pelas seções acima para começar sua jornada.
            </p>
            <button
                onClick={handleRandomButtonClick}
                disabled={isLoading}
                className="bg-tennis-accent text-tennis-dark font-bold py-3.5 px-10 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isLoading ? "Gerando..." : "RANDOM"}
            </button>
             <p className="mt-2 text-sm text-tennis-light/60">Exibir uma Rackard aleatória do universo do jogo.</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-tennis-dark font-sans flex flex-col">
      <Header setCurrentView={setCurrentView} currentView={currentView} />
      <main className="flex-grow overflow-y-auto">
        {renderView()}
      </main>
      
      <Modal isOpen={!!selectedCard} onClose={() => setSelectedCard(null)}>
        {selectedCard && <CardDetails card={selectedCard} />}
      </Modal>

      <Modal isOpen={!!modalMessage} onClose={() => setModalMessage(null)} title="Notificação">
        <p>{modalMessage}</p>
      </Modal>
    </div>
  );
};

export default App;