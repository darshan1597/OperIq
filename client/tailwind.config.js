/** @type {import('tailwindcss').Config} */
export default {
  content:{relative:true,files:['./index.html','./src/**/*.{js,jsx}']},
  theme:{
    extend:{
      colors:{
        navy:'#0e1b3b',
        orange:'#ff550b',
        muted:'#6c7892',
        border:'#e9ebf0',
        cream:'#fff0e2',
      },
      fontFamily:{
        ui:['DM Sans','Segoe UI','Arial','sans-serif'],
        display:['Manrope','DM Sans','sans-serif'],
      },
      fontSize:{
        micro:'8px',
        caption:'9px',
        '2xs':'10px',
        tiny:'11px',
        '13':'13px',
      },
      fontWeight:{650:'650',750:'750'},
      spacing:{18:'72px'},
      screens:{
        laptop:{max:'1300px'},
        desktop:{max:'1150px'},
        compact:{max:'1000px'},
        tablet:{max:'850px'},
        mobile:{max:'620px'},
        phone:{max:'580px'},
        wide:{min:'1600px'},
      },
    },
  },
  plugins:[],
};
