import React, {useEffect, useState} from 'react';
import axios from 'axios';
export default function Quiz({address}){
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [mintedCards, setMintedCards] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(()=>{ fetch(); },[]);
    async function fetch(){ const r = await axios.get('http://localhost:4000/quiz'); setQuestions(r.data.results || []); }
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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (<div>
        <h2>Daily Quiz</h2>
        {questions.map((q,idx)=> (<div key={idx} className="card">
            <div dangerouslySetInnerHTML={{__html:q.question}} />
            {([...q.incorrect_answers, q.correct_answer].sort()).map((a,ai)=>(<div key={ai}><label><input type="radio" name={'q'+idx} onChange={()=>select(idx,a)} /> <span dangerouslySetInnerHTML={{__html:a}}/></label></div>))}
        </div>))}
        <div><button onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Submit Answers'}</button></div>
        {result && <div>
            <h3>Results</h3>
            <p>Score: {result.pulls} / {questions.length}</p>
            <p>You earned {result.pulls} card pulls!</p>
        </div>}
        
        {mintedCards.length > 0 && <div className="minted-container">
            <h3>New Cards Obtained!</h3>
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                {mintedCards.map((card, i) => (
                    <div key={i} style={{border:'1px solid #ccc', padding:'10px', borderRadius:'8px', textAlign:'center'}}>
                        <img src={card.imageURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} alt={card.name} width="150" />
                        <p><strong>{card.name}</strong></p>
                        <p>{card.rarity}</p>
                        <p>Atk: {card.attack} | HP: {card.health} | Spd: {card.speed}</p>
                    </div>
                ))}
            </div>
        </div>}
    </div>);
}
