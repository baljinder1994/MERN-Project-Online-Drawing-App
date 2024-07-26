import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import io from 'socket.io-client'
import {v4 as uuidv4} from 'uuid'

const DrawingCanvas = () => {
    const{roomId} =useParams();
    const canvasRef=useRef(null)
    const contextRef=useRef(null);
    const[isDrawing, setIsDrawing]=useState(false);
    const[color,setColor]=useState('#000000');
    const[brushSize,setBrushSize]=useState(5);
    const[tool,setTool]=useState('freeDrawing');
    const socket=useRef(io('http://localhost:5000')).current;
    const[shareLink,setShareLink]=useState('');
    const[userId,setserId]=useState(uuidv4());


    useEffect(() =>{
        const canvas=canvasRef.current;
        const width=800;
        const height=600;

        canvas.width= width * 2
        canvas.height= height * 2;
        canvas.style.width= `${width}px`
        canvas.style.height= `${height}px`

        const context=canvas.getContext('2d');
        context.scale(2,2)
        contextRef.lineCap='round';
        contextRef.current=context;



        socket.emit('joinRoom',{roomId,userId})

        socket.on('initialData',(data) =>{
            context.clearRect(0,0,canvas.width,canvas.height);
            data.forEach(({x0,y0,x1,y1,color,size,tool}) =>{
                context.strokeStyle=color;
                contextRef.lineWidth=size;
                context.beginPath();
                if(tool === 'rectangle'){
                    context.rect(x0,y0,x1 - x0, y1 - y0);

                }else if(tool === 'circle'){
                    context.arc(x0,y0,Math.sqrt(Math.pow(x1 - x0,2) + Math.pow(y1 - y0, 2)),0, 2 * Math.PI)
                }else{
                    context.moveTo(x0,y0)
                    context.lineTo(x1,y1)
                }
                context.stroke();
                context.closePath()
            })
        })

        socket.on('draw',({x0,y0,x1,y1,color,size,tool})=>{
            context.strokeStyle=color;
            context.lineWidth=size;
            context.beginPath();
            if(tool === 'rectangle'){
                context.rect(x0,y0,x1 - x0, y1 - y0);
            }else if(tool === 'circle'){
                context.arc(x0,y0,Math.sqrt(Math.pow(x1 - x0,2) + Math.pow(y1 - y0, 2)),0, 2 * Math.PI)
            }else{
                context.moveTo(x0,y0)
                context.lineTo(x1,y1)
            }
            context.stroke()
            context.closePath()
        })

        socket.on('clearCanvas',() =>{
            context.clearRect(0,0,canvas.width,canvas.height)
        })

        socket.on('toolChange', ({tool,value}) =>{
            if(tool === 'color'){
                setColor(value)
            }else if(tool === 'brushSize'){
                setBrushSize(value)
            }else {
                setTool(value)
            }
        })
        return() =>{
            socket.off('draw')
            socket.off('initialData')
            socket.off('clearCanvas')
            socket.off('toolchange')
        }



    },[roomId,userId])
    
    const startDrawing=({nativeEvent})=>{
      const {offsetX, offsetY}=nativeEvent;
      contextRef.current.currentPosition={x0: offsetX, y0: offsetY};
      setIsDrawing(true)
    }
    const finishDrawing=()=>{
         if(!contextRef.current.currentPosition) return
         const{x0,y0}=contextRef.current.currentPosition;
         const{offsetX,offsetY} =contextRef.current.currentPosition.endPosition || {offsetX : x0, offsetY:y0}
    
         if(tool === 'rectangle' || tool === 'circle'){
            contextRef.current.beginPath();
            if(tool == 'rectangle'){
                contextRef.current.rect(x0,y0,offsetX - x0, offsetY - y0)

            }else if(tool === 'circle'){
                contextRef.current.arc(x0,y0,Math.sqrt(Math.pow(offsetX - x0,2) + Math.pow(offsetY - y0, 2)),0, 2 * Math.PI)
            }
            contextRef.current.strokeStyle=color;
            contextRef.current.lineWidth=brushSize
            contextRef.current.stroke();
            contextRef.current.closePath()


            socket.emit('draw',{
                roomId,
                userId,
                x0,
                y0,
                x1:offsetX,
                y1:offsetY,
                color:color,
                size:brushSize,
                tool:tool
            })
         }
         setIsDrawing(false);
         contextRef.current.currentPosition=null
        }
    const draw=({nativeEvent})=>{
          if(!isDrawing){
            return;
          }
          const {offsetX,offsetY} = nativeEvent;
          contextRef.current.currentPosition.endPosition={offsetX, offsetY}

          if(tool === 'freeDrawing'){
            const {x0, y0} =contextRef.current.currentPosition;

            contextRef.current.lineTo(offsetX,offsetY);
            contextRef.current.strokeStyle=color;
            contextRef.current.lineWidth=brushSize;
            contextRef.current.stroke();
            socket.emit('draw',{
                roomId,
                userId,
                x0,
                y0,
                x1:offsetX,
                y1:offsetY,
                color:color,
                size:brushSize,
                tool:tool
            })

            contextRef.current.currentPosition={x0: offsetX, y0: offsetY}
          }
    }

   const clearCanvas=() =>{
      contextRef.current.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
      socket.emit('clearCanvas',roomId)
      
   }
   
        
   const handleToolChange=(tool,value)=>{
       if(tool === 'color'){
        setColor(value)
       }else if(tool ==='brushSize'){
        setBrushSize(value)
       }
       else{
        setTool(value)
       }
       socket.emit('toolChange',{roomId,tool,value})
   }
   const generateShareLink=() =>{
    const link=`${window.location.origin}/draw/${roomId}`;
    setShareLink(link)
   }
   const copyToClipboard =() =>{
    navigator.clipboard.writeText(shareLink)
        .then(() => alert('Link copied to clipboard'));
    }
   useEffect(()=>{
    generateShareLink()
},[roomId])
  return (
    <div className='container'>
      <canvas
       className='canvas'
       onMouseDown={startDrawing}
       onMouseUp={finishDrawing}
       onMouseMove={draw}
       onMouseLeave={finishDrawing}
       ref={canvasRef} 
      />
     <div className='controls'>
        <label htmlFor="color">Color:</label>
        <input
         id="color"
         type="color"
         value={color}
         onChange={(e) => handleToolChange('color', e.target.value)}
        />
        <label htmlFor="brushSize">Brush Size:</label>
        <input
          id="brushSize"
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => handleToolChange('brushSize', e.target.value)}
        ></input>
        <label htmlFor="tool">Tool:</label>
        <select id="tool" value="tool" onChange={(e)=> handleToolChange('tool', e.target.value)}>
          <option value="freeDrawing">Free Drawing</option>
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
        </select>
      <button onClick={clearCanvas}>Clear Canvas</button>
      <div>
        <button onClick={copyToClipboard}>Share This Drawing</button>
      <p>Share this link with others:</p>
      <a href={shareLink} target="_blank" rel="noopener no refferer">{shareLink}</a>
      </div>
     </div>
        
     </div>
  )
}

export default DrawingCanvas