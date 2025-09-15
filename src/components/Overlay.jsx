import React from 'react'


const Overlay = () => {

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <a style={{ position: 'absolute', bottom: 40, left: 90, fontSize: '13px' }}>
        Three js
        <br />
        Project Showcase
      </a>
      <div style={{ position: 'absolute', top: 40, left: 40, fontSize: '13px' }}>Lamborghini Revuelto —</div>
    </div>
  )
}

export default Overlay