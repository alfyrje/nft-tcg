import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Quiz({address}){
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [mintedCards, setMintedCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showReward, setShowReward] = useState(false);

    useEffect(()=>{ fetch(); },[]);
    async function fetch(){ 
        setLoading(true);
        try {
            const r = await axios.get('http://localhost:4000/quiz'); 
            setQuestions(r.data.results || []); 
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    
    function select(qIdx, ans){ setAnswers({...answers, [qIdx]: ans}); }
    
    async function submit(){
        setLoading(true);
        try {
            const payload = { address, results: questions.map((q,idx)=>({ question: q.question, correct_answer: q.correct_answer, user_answer: answers[idx] })) };
            const r = await axios.post('http://localhost:4000/quiz/submit', payload);
            setResult(r.data);
            
            const pulls = r.data.pulls;
            const newCards = [];
            for(let i=0; i<pulls; i++){
                try {
                    const pullRes = await axios.post('http://localhost:4000/gacha/pull', { to: address });
                    if(pullRes.data.ok) {
                        newCards.push(pullRes.data.mint);
                    }
                } catch(e) {
                    console.error("Pull failed", e);
                }
            }
            setMintedCards(newCards);
            if (newCards.length > 0) {
                setShowReward(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function handleKeepSolving() {
        setResult(null);
        setMintedCards([]);
        setAnswers({});
        setShowReward(false);
        fetch();
    }

    return (<div>
        <h2>Daily Quiz</h2>
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px'}}>
            {questions.map((q,idx)=> (<div key={idx} className="card" style={{textAlign:'left', verticalAlign: 'top'}}>
                <div dangerouslySetInnerHTML={{__html:q.question}} style={{fontWeight:'bold', marginBottom:'10px', minHeight: '50px'}} />
                {([...q.incorrect_answers, q.correct_answer].sort()).map((a,ai)=>(<div key={ai} style={{margin:'5px 0'}}>
                    <label style={{cursor:'pointer', fontSize:'1rem'}}>
                        <input type="radio" name={'q'+idx} onChange={()=>select(idx,a)} style={{marginRight:'10px'}} /> 
                        <span dangerouslySetInnerHTML={{__html:a}}/>
                    </label>
                </div>))}
            </div>))}
        </div>
        
        <div style={{marginTop:'20px'}}>
            <button onClick={submit} disabled={loading || questions.length === 0}>
                {loading ? 'Processing...' : 'Submit Answers'}
            </button>
        </div>

        {result && !showReward && <div>
            <h3>Results</h3>
            <p>Score: {result.pulls} / {questions.length}</p>
            {result.pulls === 0 && <p>Try again to earn cards!</p>}
        </div>}
        
        {showReward && (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div style={{
                    backgroundColor: '#e0f7fa', padding: '40px', borderRadius: '30px',
                    maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
                    border: '8px solid #4fc3f7', boxShadow: '0 0 50px rgba(79, 195, 247, 0.5)',
                    textAlign: 'center'
                }}>
                    <h2 style={{fontSize: '3rem', color: '#01579b', marginBottom: '30px'}}>🎉 Congratulations! 🎉</h2>
                    <p style={{fontSize: '1.5rem', marginBottom: '20px'}}>You found new cards!</p>
                    
                    <div style={{display:'flex', gap:'20px', flexWrap:'wrap', justifyContent:'center', marginBottom:'40px'}}>
                        {mintedCards.map((card, i) => (
                            <div key={i} className="card" style={{transform: 'scale(1.1)', margin: '20px'}}>
                                <img src={card.imageURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} alt={card.name} width="100%" />
                                <h3 style={{margin:'10px 0'}}>{card.name}</h3>
                                <p style={{fontWeight:'bold', color:'#f57f17'}}>{card.rarity}</p>
                                <div style={{display:'flex', justifyContent:'space-around', fontSize:'0.9rem'}}>
                                    <span>⚔️ {card.attack}</span>
                                    <span>❤️ {card.health}</span>
                                    <span>⚡ {card.speed}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{display:'flex', gap:'20px', justifyContent:'center'}}>
                        <button onClick={handleKeepSolving} style={{fontSize:'1.3rem', padding:'15px 30px'}}>
                            🔄 Keep Solving
                        </button>
                        <button onClick={() => navigate('/collection')} style={{fontSize:'1.3rem', padding:'15px 30px', backgroundColor:'#81c784', borderColor:'#a5d6a7'}}>
                            🎒 Go to Collection
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>);
}
